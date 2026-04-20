# Mobile Profile Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expo 모바일 앱의 `ProfileScreen`에서 닉네임, 마케팅 알림, 안전한 로그아웃을 실제 Supabase 기반 기능으로 완성한다.

**Architecture:** 기존 `createAccountRepository()`의 읽기 흐름은 유지하고, 같은 repository에 `marketing_opt_in` 읽기와 `updateProfileSettings()` 쓰기 메서드를 추가한다. `ProfileScreen`은 이 repository 결과를 폼 초기값으로 사용하고, 저장/실패/로그아웃 상태를 화면 안에서 관리한다.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase JS, Jest, React Native Testing Library

---

## File Structure

### Modify

- `/home/ciel/nova/inkroad-app/src/mobile/reader/types.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/account-repository.test.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx`

---

### Task 1: Extend account repository for profile settings reads and writes

**Files:**
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/reader/types.ts`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/account-repository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/account-repository.test.ts
it("returns marketing opt-in from the profile row", async () => {
  const { supabase } = jest.requireMock("../../../../lib/supabase");

  const profilesQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: {
        id: "user-1",
        display_name: "림루",
        role: "reader",
        marketing_opt_in: true,
      },
      error: null,
    }),
  };

  const authorsQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  const libraryQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  const purchasesQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  supabase.from.mockImplementation((table: string) => {
    if (table === "profiles") return profilesQuery;
    if (table === "authors") return authorsQuery;
    if (table === "library_items") return libraryQuery;
    if (table === "purchases") return purchasesQuery;
    throw new Error(`Unexpected table: ${table}`);
  });

  const repository = createAccountRepository();
  const result = await repository.getProfileData("user-1", {
    email: "rimuru@example.com",
    user_metadata: { display_name: "림루" },
  });

  expect(result.profile.marketingOptIn).toBe(true);
});

it("updates display name and marketing opt-in through profiles", async () => {
  const { supabase } = jest.requireMock("../../../../lib/supabase");

  const updateQuery = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: {
        id: "user-1",
        display_name: "새 닉네임",
        role: "reader",
        marketing_opt_in: false,
      },
      error: null,
    }),
  };

  supabase.from.mockImplementation((table: string) => {
    if (table === "profiles") return updateQuery;
    throw new Error(`Unexpected table: ${table}`);
  });

  const repository = createAccountRepository();
  const profile = await repository.updateProfileSettings("user-1", {
    displayName: " 새 닉네임 ",
    marketingOptIn: false,
    email: "rimuru@example.com",
  });

  expect(updateQuery.update).toHaveBeenCalledWith({
    display_name: "새 닉네임",
    marketing_opt_in: false,
  });
  expect(profile.displayName).toBe("새 닉네임");
  expect(profile.marketingOptIn).toBe(false);
});
```

- [ ] **Step 2: Run the repository tests to verify they fail**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/account-repository.test.ts --runInBand
```

Expected: FAIL because `marketingOptIn` does not exist yet and `updateProfileSettings()` is undefined.

- [ ] **Step 3: Add the new profile setting type fields**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/types.ts
export interface ReaderAccountProfile {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isCreator: boolean;
  marketingOptIn: boolean;
}

export interface ReaderProfileSettingsInput {
  displayName: string;
  marketingOptIn: boolean;
  email: string;
}
```

- [ ] **Step 4: Update repository reads and implement profile settings write**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts
async function fetchProfileRecord(userId: string) {
  const result = await supabase
    .from("profiles")
    .select("id, display_name, role, marketing_opt_in")
    .eq("id", userId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

function buildProfile(
  userId: string,
  seed: SessionProfileSeed,
  profile: { display_name?: string | null; role?: string | null; marketing_opt_in?: boolean | null } | null,
  isCreator: boolean
): ReaderAccountProfile {
  return {
    id: userId,
    displayName: toDisplayName(seed, profile),
    email: seed.email ?? "",
    role: profile?.role ?? "reader",
    isCreator,
    marketingOptIn: Boolean(profile?.marketing_opt_in),
  };
}

async updateProfileSettings(
  userId: string,
  input: ReaderProfileSettingsInput
): Promise<ReaderAccountProfile> {
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("닉네임을 입력해 주세요.");
  }
  if (displayName.length > 20) {
    throw new Error("닉네임은 20자 이하로 입력해 주세요.");
  }

  const result = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      marketing_opt_in: input.marketingOptIn,
    })
    .eq("id", userId)
    .select("id, display_name, role, marketing_opt_in")
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return buildProfile(
    userId,
    { email: input.email, user_metadata: { display_name: displayName } },
    result.data,
    false
  );
}
```

- [ ] **Step 5: Run the repository tests to verify they pass**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/account-repository.test.ts --runInBand
```

Expected: PASS for the new marketing opt-in read/write coverage and the existing library/profile tests in this file.

- [ ] **Step 6: Commit**

```bash
cd /home/ciel/nova
git add \
  /home/ciel/nova/inkroad-app/src/mobile/reader/types.ts \
  /home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts \
  /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/account-repository.test.ts
git commit -m "feat: add profile settings repository support"
```

---

### Task 2: Add failing ProfileScreen tests for settings form and logout errors

**Files:**
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx`

- [ ] **Step 1: Write the failing ProfileScreen tests**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx
const mockUpdateProfileSettings = jest.fn();

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
      },
      stats: {
        readingCount: 2,
        wishlistCount: 3,
        purchasedCount: 1,
      },
    }),
    updateProfileSettings: (...args: unknown[]) => mockUpdateProfileSettings(...args),
  }),
}));

it("prefills the profile settings form from repository data", async () => {
  render(<ProfileScreen />);

  const input = await screen.findByDisplayValue("림루");
  const toggleLabel = screen.getByText("마케팅 알림 수신");

  expect(input).toBeTruthy();
  expect(toggleLabel).toBeTruthy();
});

it("saves updated profile settings and refreshes the visible name", async () => {
  mockUpdateProfileSettings.mockResolvedValueOnce({
    id: "user-1",
    displayName: "새 닉네임",
    email: "rimuru@example.com",
    role: "reader",
    isCreator: true,
    marketingOptIn: false,
  });

  render(<ProfileScreen />);

  fireEvent.changeText(await screen.findByDisplayValue("림루"), "새 닉네임");
  fireEvent.press(screen.getByText("저장하기"));

  await waitFor(() => {
    expect(mockUpdateProfileSettings).toHaveBeenCalledWith("user-1", {
      displayName: "새 닉네임",
      marketingOptIn: true,
      email: "rimuru@example.com",
    });
    expect(screen.getByText("새 닉네임")).toBeTruthy();
    expect(screen.getByText("프로필 설정이 저장되었습니다.")).toBeTruthy();
  });
});

it("shows an error when logout fails", async () => {
  mockSignOut.mockResolvedValueOnce({
    error: new Error("network down"),
    data: { session: null, user: null },
  });

  render(<ProfileScreen />);
  fireEvent.press(await screen.findByText("로그아웃"));

  await waitFor(() => {
    expect(screen.getByText("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the ProfileScreen tests to verify they fail**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/profile-screen.test.tsx --runInBand
```

Expected: FAIL because the screen does not render a settings form, save button, or logout failure message yet.

- [ ] **Step 3: Make the ProfileScreen test mocks deterministic**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx
beforeEach(() => {
  mockPush.mockClear();
  mockSignOut.mockReset();
  mockUpdateProfileSettings.mockReset();
  mockSignOut.mockResolvedValue({
    error: null,
    data: { session: null, user: null },
  });
});
```

- [ ] **Step 4: Re-run the ProfileScreen tests to confirm the failure is still about missing UI/behavior**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/profile-screen.test.tsx --runInBand
```

Expected: FAIL with assertions about missing settings inputs or save/logout status behavior, not mock setup errors.

- [ ] **Step 5: Commit**

```bash
cd /home/ciel/nova
git add /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx
git commit -m "test: cover profile settings interactions"
```

---

### Task 3: Implement ProfileScreen settings form and safe logout behavior

**Files:**
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts`

- [ ] **Step 1: Add local form and status state to ProfileScreen**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx
const [displayNameInput, setDisplayNameInput] = useState("");
const [marketingOptIn, setMarketingOptIn] = useState(false);
const [saveMessage, setSaveMessage] = useState<string | null>(null);
const [saveError, setSaveError] = useState<string | null>(null);
const [isSavingProfile, setIsSavingProfile] = useState(false);
const [isSigningOut, setIsSigningOut] = useState(false);

useEffect(() => {
  if (!profileData) {
    return;
  }

  setDisplayNameInput(profileData.profile.displayName);
  setMarketingOptIn(profileData.profile.marketingOptIn);
  setSaveMessage(null);
  setSaveError(null);
}, [profileData]);
```

- [ ] **Step 2: Add save and logout handlers**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx
const handleSaveProfile = async () => {
  if (!session?.user || isSavingProfile) {
    return;
  }

  setIsSavingProfile(true);
  setSaveMessage(null);
  setSaveError(null);

  try {
    const updatedProfile = await accountRepository.updateProfileSettings(session.user.id, {
      displayName: displayNameInput,
      marketingOptIn,
      email: session.user.email ?? "",
    });

    setProfileData((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              displayName: updatedProfile.displayName,
              marketingOptIn: updatedProfile.marketingOptIn,
            },
          }
        : current
    );
    setDisplayNameInput(updatedProfile.displayName);
    setMarketingOptIn(updatedProfile.marketingOptIn);
    setSaveMessage("프로필 설정이 저장되었습니다.");
  } catch (error) {
    setSaveError(error instanceof Error ? error.message : "프로필 설정을 저장하지 못했습니다.");
  } finally {
    setIsSavingProfile(false);
  }
};

const handleLogout = async () => {
  if (isSigningOut) {
    return;
  }

  setIsSigningOut(true);
  setSaveError(null);

  try {
    const result = await supabase.auth.signOut();
    if (result.error) {
      throw result.error;
    }
    router.push("/auth");
  } catch (_error) {
    setSaveError("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    setIsSigningOut(false);
  }
};
```

- [ ] **Step 3: Render the settings form in the logged-in profile view**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx
<View style={styles.settingsCard}>
  <Text style={styles.settingsTitle}>프로필 설정</Text>

  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>닉네임</Text>
    <TextInput
      value={displayNameInput}
      onChangeText={setDisplayNameInput}
      placeholder="닉네임을 입력해 주세요"
      placeholderTextColor={c.fg3}
      style={styles.textInput}
      maxLength={20}
      autoCapitalize="none"
    />
  </View>

  <View style={styles.switchRow}>
    <View style={styles.switchCopy}>
      <Text style={styles.fieldLabel}>마케팅 알림 수신</Text>
      <Text style={styles.helperInline}>이벤트와 프로모션 소식을 받아봅니다.</Text>
    </View>
    <Switch value={marketingOptIn} onValueChange={setMarketingOptIn} />
  </View>

  {(saveMessage || saveError) && (
    <Text style={saveError ? styles.errorText : styles.successText}>
      {saveError ?? saveMessage}
    </Text>
  )}

  <TouchableOpacity
    style={[styles.btnPrimary, isSavingProfile && styles.btnDisabled]}
    onPress={handleSaveProfile}
    disabled={isSavingProfile}
  >
    <Text style={styles.btnPrimaryText}>
      {isSavingProfile ? "저장 중..." : "저장하기"}
    </Text>
  </TouchableOpacity>
</View>

<TouchableOpacity
  style={[styles.menuItem, styles.menuItemLast, isSigningOut && styles.menuItemDisabled]}
  onPress={handleLogout}
  disabled={isSigningOut}
>
  <Text style={[styles.menuLabel, styles.menuLabelDanger]}>
    {isSigningOut ? "로그아웃 중..." : "로그아웃"}
  </Text>
</TouchableOpacity>
```

- [ ] **Step 4: Add the missing React Native imports and styles**

```tsx
// /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const styles = StyleSheet.create({
  settingsCard: {
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: c.borderWhite,
    borderRadius: r.lg,
    gap: 14,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: c.fg1,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: c.fg1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: c.borderWhite,
    borderRadius: r.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.fg1,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  helperInline: {
    fontSize: 12,
    lineHeight: 18,
    color: c.fg3,
  },
  successText: {
    fontSize: 13,
    color: "#7CFCB7",
  },
  errorText: {
    fontSize: 13,
    color: "#FF9A9A",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  menuItemDisabled: {
    opacity: 0.55,
  },
});
```

- [ ] **Step 5: Run the ProfileScreen tests to verify they pass**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/profile-screen.test.tsx --runInBand
```

Expected: PASS for the existing profile render/logout test and the new settings save/error cases.

- [ ] **Step 6: Commit**

```bash
cd /home/ciel/nova
git add \
  /home/ciel/nova/inkroad-app/src/mobile/screens/ProfileScreen.tsx \
  /home/ciel/nova/inkroad-app/src/mobile/reader/accountRepository.ts
git commit -m "feat: add mobile profile settings form"
```

---

### Task 4: Run focused regression verification

**Files:**
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/account-repository.test.ts`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/profile-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/library-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/home-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/search-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-detail-screen.test.tsx`
- Test: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-viewer-screen.test.tsx`

- [ ] **Step 1: Run the focused reader regression suite**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/reader/__tests__/account-repository.test.ts \
  src/mobile/reader/__tests__/profile-screen.test.tsx \
  src/mobile/reader/__tests__/library-screen.test.tsx \
  src/mobile/reader/__tests__/home-screen.test.tsx \
  src/mobile/reader/__tests__/search-screen.test.tsx \
  src/mobile/reader/__tests__/novel-detail-screen.test.tsx \
  src/mobile/reader/__tests__/novel-viewer-screen.test.tsx \
  --runInBand
```

Expected: PASS across the reader repository and screen tests with no new failures.

- [ ] **Step 2: Run the existing Supabase/creator safety net**

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

Expected: PASS, with only the previously known `act(...)` / AsyncStorage warnings if they still exist.

- [ ] **Step 3: Commit**

```bash
cd /home/ciel/nova
git add /home/ciel/nova/inkroad-app
git commit -m "test: verify mobile profile settings regressions"
```
