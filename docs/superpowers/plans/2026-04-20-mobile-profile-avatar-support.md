# Mobile Profile Avatar and Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expo 모바일 앱의 `ProfileScreen`에 아바타 업로드와 앱 내 문의 기능을 추가하고, 문의 저장 후 관리자 메일 알림까지 실제 Supabase 기반으로 연결한다.

**Architecture:** 모바일 앱은 `accountRepository`를 통해 아바타 업로드와 문의 제출을 수행하고, Supabase는 `support_tickets` 테이블, `profile-avatars` Storage bucket, `notify-support-ticket` Edge Function으로 백엔드 흐름을 처리한다. UI는 기존 `ProfileScreen` 위에 아바타 변경과 문의 폼을 확장하고, 저장 성공과 메일 알림 실패를 분리해 사용자에게 보여 준다.

**Tech Stack:** Expo Router, React Native, TypeScript, Expo Image Picker, Supabase JS, Supabase Storage, Supabase Edge Functions, Jest, React Native Testing Library

---

## File Structure

### Create

- `/home/ciel/nova/supabase/migrations/202604201100_add_support_tickets_and_avatar_storage.sql`
- `/home/ciel/nova/supabase/functions/notify-support-ticket/index.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-support-repository.test.ts`

### Modify

- `/home/ciel/nova/inkroad-app/package.json`
- `/home/ciel/nova/inkroad-app/package-lock.json`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/types.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/account-repository.test.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx`
- `/home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx`
- `/home/ciel/nova/supabase/schema.sql`

---

### Task 1: Add Supabase schema and Edge Function contract for support tickets

**Files:**
- Create: `/home/ciel/nova/supabase/migrations/202604201100_add_support_tickets_and_avatar_storage.sql`
- Create: `/home/ciel/nova/supabase/functions/notify-support-ticket/index.ts`
- Modify: `/home/ciel/nova/supabase/schema.sql`

- [ ] **Step 1: Write the migration with support tickets table, policies, and storage setup**

```sql
-- /home/ciel/nova/supabase/migrations/202604201100_add_support_tickets_and_avatar_storage.sql
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  category text not null check (category in ('account', 'payment', 'content', 'bug', 'other')),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.support_tickets enable row level security;

drop policy if exists "Users can insert own support tickets" on public.support_tickets;
create policy "Users can insert own support tickets"
  on public.support_tickets
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can view own support tickets" on public.support_tickets;
create policy "Users can view own support tickets"
  on public.support_tickets
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own profile avatars" on storage.objects;
create policy "Users can upload own profile avatars"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users can update own profile avatars" on storage.objects;
create policy "Users can update own profile avatars"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users can view profile avatars" on storage.objects;
create policy "Users can view profile avatars"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'profile-avatars');
```

- [ ] **Step 2: Reflect the same schema in the canonical schema snapshot**

```sql
-- /home/ciel/nova/supabase/schema.sql
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  category text not null check (category in ('account', 'payment', 'content', 'bug', 'other')),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.support_tickets enable row level security;

drop policy if exists "Users can insert own support tickets" on public.support_tickets;
create policy "Users can insert own support tickets"
  on public.support_tickets
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can view own support tickets" on public.support_tickets;
create policy "Users can view own support tickets"
  on public.support_tickets
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);
```

- [ ] **Step 3: Add the Edge Function for admin email notification**

```ts
// /home/ciel/nova/supabase/functions/notify-support-ticket/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ADMIN_EMAIL = Deno.env.get("SUPPORT_ADMIN_EMAIL") ?? "rimuru2178@gmail.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "support@inkroad.app";

serve(async (request) => {
  try {
    const payload = await request.json();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [ADMIN_EMAIL],
        subject: `[INKROAD 문의] ${payload.subject}`,
        text: [
          `ticketId: ${payload.ticketId}`,
          `userId: ${payload.userId}`,
          `email: ${payload.email}`,
          `category: ${payload.category}`,
          "",
          payload.message,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return new Response(JSON.stringify({ ok: false, error: body }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

- [ ] **Step 4: Sanity-check the new files**

Run:

```bash
sed -n '1,220p' /home/ciel/nova/supabase/migrations/202604201100_add_support_tickets_and_avatar_storage.sql
sed -n '1,220p' /home/ciel/nova/supabase/functions/notify-support-ticket/index.ts
```

Expected: Table, RLS, storage policies, and the email function are present with no placeholders.

- [ ] **Step 5: Commit**

```bash
cd /home/ciel/nova
git add \
  /home/ciel/nova/supabase/migrations/202604201100_add_support_tickets_and_avatar_storage.sql \
  /home/ciel/nova/supabase/functions/notify-support-ticket/index.ts \
  /home/ciel/nova/supabase/schema.sql
git commit -m "feat: add support ticket backend contract"
```

---

### Task 2: Add account repository support for avatar uploads and support tickets

**Files:**
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/reader/types.ts`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/account-repository.test.ts`
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-support-repository.test.ts`

- [ ] **Step 1: Write failing repository tests for avatar upload and support submission**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-support-repository.test.ts
import { createAccountRepository } from "../accountRepository";

jest.mock("../../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe("profile support repository", () => {
  it("uploads an avatar and updates profiles.avatar_url", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "user-1",
          display_name: "림루",
          role: "reader",
          marketing_opt_in: true,
          avatar_url: "https://cdn.example.com/avatar.jpg",
        },
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return updateQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: "user-1/avatar.jpg" }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: "https://cdn.example.com/avatar.jpg" },
      }),
    });

    const repository = createAccountRepository();
    const result = await repository.uploadProfileAvatar("user-1", {
      uri: "file:///avatar.jpg",
      mimeType: "image/jpeg",
      base64: "ZmFrZQ==",
    });

    expect(result.avatarUrl).toBe("https://cdn.example.com/avatar.jpg");
    expect(updateQuery.update).toHaveBeenCalledWith({
      avatar_url: "https://cdn.example.com/avatar.jpg",
    });
  });

  it("stores a support ticket and invokes the notification function", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "ticket-1",
          user_id: "user-1",
          email: "rimuru@example.com",
          category: "bug",
          subject: "앱이 멈춰요",
          message: "재현 경로",
          status: "open",
        },
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "support_tickets") return insertQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    supabase.functions.invoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    const repository = createAccountRepository();
    const result = await repository.submitSupportTicket("user-1", {
      email: "rimuru@example.com",
      category: "bug",
      subject: "앱이 멈춰요",
      message: "재현 경로",
    });

    expect(result.ticketId).toBe("ticket-1");
    expect(result.notificationStatus).toBe("sent");
    expect(supabase.functions.invoke).toHaveBeenCalledWith("notify-support-ticket", {
      body: expect.objectContaining({
        ticketId: "ticket-1",
        userId: "user-1",
        subject: "앱이 멈춰요",
      }),
    });
  });

  it("keeps the ticket saved when the notification call fails", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "ticket-2",
          user_id: "user-1",
          email: "rimuru@example.com",
          category: "other",
          subject: "일반 문의",
          message: "본문",
          status: "open",
        },
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "support_tickets") return insertQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error("mail down"),
    });

    const repository = createAccountRepository();
    const result = await repository.submitSupportTicket("user-1", {
      email: "rimuru@example.com",
      category: "other",
      subject: "일반 문의",
      message: "본문",
    });

    expect(result.ticketId).toBe("ticket-2");
    expect(result.notificationStatus).toBe("deferred");
  });
});
```

- [ ] **Step 2: Run the new repository tests to verify they fail**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/profile-support-repository.test.ts --runInBand
```

Expected: FAIL because the repository methods and new types do not exist yet.

- [ ] **Step 3: Add the new types for avatar and support flows**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/types.ts
export interface ReaderProfileAvatarUploadInput {
  uri: string;
  mimeType: string;
  base64: string;
}

export interface ReaderProfileAvatarUploadResult {
  avatarUrl: string;
}

export interface ReaderSupportTicketInput {
  email: string;
  category: "account" | "payment" | "content" | "bug" | "other";
  subject: string;
  message: string;
}

export interface ReaderSupportTicketResult {
  ticketId: string;
  notificationStatus: "sent" | "deferred";
}
```

- [ ] **Step 4: Implement minimal repository support for avatar uploads and support tickets**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts
async uploadProfileAvatar(
  userId: string,
  input: ReaderProfileAvatarUploadInput
): Promise<ReaderProfileAvatarUploadResult> {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const bytes = Uint8Array.from(atob(input.base64), (char) => char.charCodeAt(0));

  const storage = supabase.storage.from("profile-avatars");
  const uploadResult = await storage.upload(path, bytes, {
    contentType: input.mimeType,
    upsert: true,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const { data: publicData } = storage.getPublicUrl(path);
  const avatarUrl = publicData.publicUrl;

  const profileResult = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select("id, display_name, role, marketing_opt_in, avatar_url")
    .maybeSingle();

  if (profileResult.error) {
    throw profileResult.error;
  }

  return { avatarUrl };
}

async submitSupportTicket(
  userId: string,
  input: ReaderSupportTicketInput
): Promise<ReaderSupportTicketResult> {
  if (!input.subject.trim() || !input.message.trim()) {
    throw new Error("문의 제목과 내용을 입력해 주세요.");
  }

  const ticketResult = await supabase
    .from("support_tickets")
    .insert({
      user_id: userId,
      email: input.email,
      category: input.category,
      subject: input.subject.trim(),
      message: input.message.trim(),
    })
    .select("id")
    .maybeSingle();

  if (ticketResult.error || !ticketResult.data?.id) {
    throw ticketResult.error ?? new Error("문의 접수에 실패했습니다.");
  }

  const notifyResult = await supabase.functions.invoke("notify-support-ticket", {
    body: {
      ticketId: ticketResult.data.id,
      userId,
      email: input.email,
      category: input.category,
      subject: input.subject.trim(),
      message: input.message.trim(),
    },
  });

  return {
    ticketId: ticketResult.data.id,
    notificationStatus: notifyResult.error ? "deferred" : "sent",
  };
}
```

- [ ] **Step 5: Run the new repository tests to verify they pass**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/profile-support-repository.test.ts --runInBand
```

Expected: PASS for avatar upload, ticket submission, and notification fallback behavior.

- [ ] **Step 6: Commit**

```bash
cd /home/ciel/nova
git add \
  /home/ciel/nova/inkroad-app/src/mobile/reader/types.ts \
  /home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts \
  /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-support-repository.test.ts
git commit -m "feat: add profile avatar and support repository flows"
```

---

### Task 3: Add mobile dependencies and ProfileScreen UI for avatar and in-app support

**Files:**
- Modify: `/home/ciel/nova/inkroad-app/package.json`
- Modify: `/home/ciel/nova/inkroad-app/package-lock.json`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx`

- [ ] **Step 1: Add the Expo image picker dependency**

Run:

```bash
cd /home/ciel/nova/inkroad-app
npm install expo-image-picker
```

Expected: `package.json` and `package-lock.json` now include `expo-image-picker`.

- [ ] **Step 2: Write failing ProfileScreen tests for avatar and support form flows**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx
const mockLaunchImageLibraryAsync = jest.fn();
const mockUploadProfileAvatar = jest.fn();
const mockSubmitSupportTicket = jest.fn();

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("../accountRepository", () => ({
  createAccountRepository: () => ({
    getProfileData: jest.fn().mockResolvedValue({
      profile: {
        id: "user-1",
        displayName: "림루",
        email: "rimuru@example.com",
        role: "reader",
        isCreator: true,
        marketingOptIn: true,
        avatarUrl: null,
      },
      stats: {
        readingCount: 2,
        wishlistCount: 3,
        purchasedCount: 1,
      },
    }),
    updateProfileSettings: (...args: unknown[]) => mockUpdateProfileSettings(...args),
    uploadProfileAvatar: (...args: unknown[]) => mockUploadProfileAvatar(...args),
    submitSupportTicket: (...args: unknown[]) => mockSubmitSupportTicket(...args),
  }),
}));

it("uploads a selected avatar and updates the profile card", async () => {
  mockLaunchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [
      {
        uri: "file:///avatar.jpg",
        mimeType: "image/jpeg",
        base64: "ZmFrZQ==",
      },
    ],
  });
  mockUploadProfileAvatar.mockResolvedValueOnce({
    avatarUrl: "https://cdn.example.com/avatar.jpg",
  });

  render(<ProfileScreen />);
  fireEvent.press(await screen.findByText("아바타 변경"));

  await waitFor(() => {
    expect(mockUploadProfileAvatar).toHaveBeenCalledWith("user-1", {
      uri: "file:///avatar.jpg",
      mimeType: "image/jpeg",
      base64: "ZmFrZQ==",
    });
    expect(screen.getByText("아바타가 변경되었습니다.")).toBeTruthy();
  });
});

it("opens the in-app support form and submits a ticket", async () => {
  mockSubmitSupportTicket.mockResolvedValueOnce({
    ticketId: "ticket-1",
    notificationStatus: "sent",
  });

  render(<ProfileScreen />);
  fireEvent.press(await screen.findByText("고객센터"));

  fireEvent.changeText(await screen.findByPlaceholderText("문의 제목"), "앱이 멈춰요");
  fireEvent.changeText(screen.getByPlaceholderText("문의 내용을 입력해 주세요"), "재현 경로");
  fireEvent.press(screen.getByText("문의 보내기"));

  await waitFor(() => {
    expect(mockSubmitSupportTicket).toHaveBeenCalledWith("user-1", {
      email: "rimuru@example.com",
      category: "other",
      subject: "앱이 멈춰요",
      message: "재현 경로",
    });
    expect(screen.getByText("문의가 접수되었고 관리자에게 전달되었습니다.")).toBeTruthy();
  });
});

it("shows a deferred message when the ticket is saved but notification fails", async () => {
  mockSubmitSupportTicket.mockResolvedValueOnce({
    ticketId: "ticket-2",
    notificationStatus: "deferred",
  });

  render(<ProfileScreen />);
  fireEvent.press(await screen.findByText("고객센터"));

  fireEvent.changeText(await screen.findByPlaceholderText("문의 제목"), "일반 문의");
  fireEvent.changeText(screen.getByPlaceholderText("문의 내용을 입력해 주세요"), "본문");
  fireEvent.press(screen.getByText("문의 보내기"));

  await waitFor(() => {
    expect(
      screen.getByText("문의는 접수되었지만 관리자 알림이 지연될 수 있습니다.")
    ).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the ProfileScreen tests to verify they fail**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/profile-screen.test.tsx --runInBand
```

Expected: FAIL because `ProfileScreen` does not yet render avatar upload controls or an in-app support form.

- [ ] **Step 4: Implement the minimal ProfileScreen UI and state**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx
import * as ImagePicker from "expo-image-picker";
import { Image, Modal } from "react-native";

const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
const [supportVisible, setSupportVisible] = useState(false);
const [supportCategory, setSupportCategory] = useState<"other" | "bug" | "account" | "payment" | "content">("other");
const [supportSubject, setSupportSubject] = useState("");
const [supportMessage, setSupportMessage] = useState("");
const [supportStatus, setSupportStatus] = useState<string | null>(null);
const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

useEffect(() => {
  if (!profileData) return;
  setAvatarUrl(profileData.profile.avatarUrl ?? null);
}, [profileData]);

const handlePickAvatar = async () => {
  if (!session?.user || isUploadingAvatar) return;

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]?.base64) return;

  setIsUploadingAvatar(true);
  setSaveError(null);

  try {
    const uploaded = await accountRepository.uploadProfileAvatar(session.user.id, {
      uri: result.assets[0].uri,
      mimeType: result.assets[0].mimeType ?? "image/jpeg",
      base64: result.assets[0].base64,
    });
    setAvatarUrl(uploaded.avatarUrl);
    setSaveMessage("아바타가 변경되었습니다.");
  } catch (error) {
    setSaveError(error instanceof Error ? error.message : "아바타를 변경하지 못했습니다.");
  } finally {
    setIsUploadingAvatar(false);
  }
};

const handleSubmitSupport = async () => {
  if (!session?.user || isSubmittingSupport) return;

  setIsSubmittingSupport(true);
  setSupportStatus(null);

  try {
    const result = await accountRepository.submitSupportTicket(session.user.id, {
      email: session.user.email ?? "",
      category: supportCategory,
      subject: supportSubject,
      message: supportMessage,
    });

    setSupportStatus(
      result.notificationStatus === "sent"
        ? "문의가 접수되었고 관리자에게 전달되었습니다."
        : "문의는 접수되었지만 관리자 알림이 지연될 수 있습니다."
    );
    setSupportSubject("");
    setSupportMessage("");
  } catch (error) {
    setSupportStatus(
      error instanceof Error ? error.message : "문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요."
    );
  } finally {
    setIsSubmittingSupport(false);
  }
};
```

- [ ] **Step 5: Render the avatar image/button and support modal**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx
{avatarUrl ? (
  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
) : (
  <View style={styles.avatar}>
    <Text style={styles.avatarText}>{initial}</Text>
  </View>
)}

<TouchableOpacity
  style={[styles.secondaryAction, isUploadingAvatar && styles.btnDisabled]}
  onPress={handlePickAvatar}
  disabled={isUploadingAvatar}
>
  <Text style={styles.secondaryActionText}>
    {isUploadingAvatar ? "업로드 중..." : "아바타 변경"}
  </Text>
</TouchableOpacity>

<Modal visible={supportVisible} animationType="slide" transparent>
  <View style={styles.modalScrim}>
    <View style={styles.modalCard}>
      <Text style={styles.settingsTitle}>고객센터</Text>
      <TextInput
        placeholder="문의 제목"
        placeholderTextColor={c.fg3}
        value={supportSubject}
        onChangeText={setSupportSubject}
        style={styles.textInput}
      />
      <TextInput
        placeholder="문의 내용을 입력해 주세요"
        placeholderTextColor={c.fg3}
        value={supportMessage}
        onChangeText={setSupportMessage}
        style={[styles.textInput, styles.textArea]}
        multiline
      />
      {supportStatus && <Text style={styles.helperInline}>{supportStatus}</Text>}
      <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmitSupport}>
        <Text style={styles.btnPrimaryText}>
          {isSubmittingSupport ? "보내는 중..." : "문의 보내기"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => setSupportVisible(false)}>
        <Text style={styles.menuLabel}>닫기</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

- [ ] **Step 6: Wire the customer support menu to the modal and re-run tests**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx
onPress={() => {
  if (item.label === "고객센터") {
    setSupportVisible(true);
    return;
  }
  item.route ? router.push(item.route as any) : Alert.alert(item.label);
}}
```

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/profile-screen.test.tsx --runInBand
```

Expected: PASS for the existing profile settings tests and the new avatar/support form tests.

- [ ] **Step 7: Commit**

```bash
cd /home/ciel/nova
git add \
  /home/ciel/nova/inkroad-app/package.json \
  /home/ciel/nova/inkroad-app/package-lock.json \
  /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx \
  /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx
git commit -m "feat: add mobile avatar upload and support form"
```

---

### Task 4: Run focused regressions across reader, creator, and new support paths

**Files:**
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/account-repository.test.ts`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-support-repository.test.ts`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/library-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/home-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/search-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-detail-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-viewer-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/utils/__tests__/supabase-client.test.ts`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/creator/__tests__/author-repository.test.ts`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/creator/__tests__/author-home-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/creator/__tests__/author-work-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/creator/__tests__/episode-composer-screen.test.tsx`

- [ ] **Step 1: Run the reader and support regression suite**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/reader/__tests__/account-repository.test.ts \
  src/mobile/reader/__tests__/profile-support-repository.test.ts \
  src/mobile/reader/__tests__/profile-screen.test.tsx \
  src/mobile/reader/__tests__/library-screen.test.tsx \
  src/mobile/reader/__tests__/home-screen.test.tsx \
  src/mobile/reader/__tests__/search-screen.test.tsx \
  src/mobile/reader/__tests__/novel-detail-screen.test.tsx \
  src/mobile/reader/__tests__/novel-viewer-screen.test.tsx \
  --runInBand
```

Expected: PASS across the reader profile, avatar, support, and existing catalog tests.

- [ ] **Step 2: Run the creator and Supabase safety net**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/utils/__tests__/supabase-client.test.ts \
  src/mobile/creator/__tests__/author-repository.test.ts \
  src/mobile/creator/__tests__/author-home-screen.test.tsx \
  src/mobile/creator/__tests__/author-work-screen.test.tsx \
  src/mobile/creator/__tests__/episode-composer-screen.test.tsx \
  --runInBand
```

Expected: PASS, with only the previously known AsyncStorage / `act(...)` warnings if they still remain.

- [ ] **Step 3: Record the remaining operational follow-up**

```txt
- Set Edge Function secrets:
  - RESEND_API_KEY
  - RESEND_FROM_EMAIL
  - SUPPORT_ADMIN_EMAIL=rimuru2178@gmail.com
- Deploy the new Supabase migration and `notify-support-ticket` function before mobile release testing
```

- [ ] **Step 4: Commit**

```bash
cd /home/ciel/nova
git add /home/ciel/nova/inkroad-app /home/ciel/nova/supabase
git commit -m "test: verify avatar and support regressions"
```
