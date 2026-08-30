"use client";

import { ArrowForward, Close, EditOutlined } from "@mui/icons-material";
import {
  Button,
  IconButton,
  TextField,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { useCart } from "../../components/shop/CartProvider";
import { SiteHeader } from "../../components/shop/SiteHeader";
import {
  AuthRequestError,
  requestUpdateProfile,
} from "../../repositories/auth.repository";
import {
  getCurrentReturnTo,
  getLoginPath,
} from "../../utils/auth-redirect";
import styles from "./page.module.css";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export default function AccountPage() {
  const router = useRouter();
  const { user, status, signOut, updateUser } = useAuth();
  const [query, setQuery] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const { totalItems } = useCart();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(getLoginPath(getCurrentReturnTo("/account")));
    }
  }, [router, status]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "로그아웃하지 못했어요.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleEditStart = () => {
    if (!user) {
      return;
    }

    setProfileName(user.name);
    setProfileEmail(user.email ?? "");
    setProfileFeedback(null);
    setIsEditingPassword(false);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setProfileFeedback(null);
    setIsEditing(false);
  };

  const handlePasswordEditStart = () => {
    setPasswordFeedback(null);
    setNewPassword("");
    setPasswordConfirmation("");
    setIsEditing(false);
    setIsEditingPassword(true);
  };

  const handlePasswordEditCancel = () => {
    setPasswordFeedback(null);
    setNewPassword("");
    setPasswordConfirmation("");
    setIsEditingPassword(false);
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const name = profileName.trim();
    const email = profileEmail.trim().toLowerCase();

    if (!name || !email || !email.includes("@")) {
      setProfileFeedback({
        tone: "error",
        message: "이름과 이메일을 확인해주세요.",
      });
      return;
    }

    setIsSavingProfile(true);
    setProfileFeedback(null);

    try {
      const result = await requestUpdateProfile(user.id, { name, email });
      const emailChanged = email !== (user.email ?? "").toLowerCase();

      if (emailChanged) {
        try {
          await signOut();
        } catch {
          // 이메일 변경 시 서버에서 기존 토큰을 폐기하므로 안내 화면으로 이동합니다.
        }

        router.replace(
          `/auth/verification-required?email=${encodeURIComponent(
            result.user.email,
          )}`,
        );
        return;
      }

      updateUser(result.user);
      setIsEditing(false);
      setProfileFeedback({
        tone: "success",
        message: "프로필이 저장되었어요.",
      });
    } catch (error) {
      setProfileFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "프로필을 저장하지 못했어요.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        tone: "error",
        message: "비밀번호는 8자 이상이어야 합니다.",
      });
      return;
    }

    if (newPassword !== passwordConfirmation) {
      setPasswordFeedback({
        tone: "error",
        message: "새 비밀번호가 서로 일치하지 않아요.",
      });
      return;
    }

    setIsSavingPassword(true);
    setPasswordFeedback(null);
    setLogoutError("");

    try {
      await requestUpdateProfile(user.id, { password: newPassword });
      setIsEditingPassword(false);
      setNewPassword("");
      setPasswordConfirmation("");
      window.alert(
        "비밀번호가 변경되었습니다.\n보안을 위해 다시 로그인해주세요.",
      );

      try {
        await signOut();
        router.replace("/login");
        return;
      } catch {
        setLogoutError(
          "비밀번호는 변경되었지만 로그아웃하지 못했어요. 다시 로그아웃해주세요.",
        );
      }
    } catch (error) {
      const message =
        error instanceof AuthRequestError &&
        error.code === "PASSWORD_REUSE_NOT_ALLOWED"
          ? "기존 비밀번호와 다른 비밀번호를 사용해주세요."
          : error instanceof Error
            ? error.message
            : "비밀번호를 변경하지 못했어요.";

      setPasswordFeedback({
        tone: "error",
        message,
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const siteHeader = (
    <SiteHeader
      activeSection={null}
      cartCount={totalItems}
      query={query}
      onQueryChange={setQuery}
    />
  );

  if (status !== "authenticated" || !user) {
    return (
      <div className={styles.accountPage}>
        {siteHeader}
        {status === "loading" && (
          <main className={styles.accountMain}>
            <p className={styles.loadingMessage}>
              로그인 정보를 확인하는 중...
            </p>
          </main>
        )}
      </div>
    );
  }

  return (
    <div className={styles.accountPage}>
      {siteHeader}

      <main className={styles.accountMain}>
        <section className={styles.accountHero} aria-labelledby="account-title">
          <p className={styles.eyebrow}>My Morrow</p>
          <h1 id="account-title">나의 공간.</h1>
          <p>좋아하는 물건과 주문을 한 곳에서 천천히 관리하세요.</p>
        </section>

        <div className={styles.accountLayout}>
          <section className={styles.profileCard} aria-labelledby="profile-title">
            <div className={styles.profileHeader}>
              <div>
                <p className={styles.eyebrow}>Profile</p>
                <h2 id="profile-title">{user.name}</h2>
              </div>
              <IconButton
                type="button"
                size="small"
                disableRipple
                onClick={isEditing ? handleEditCancel : handleEditStart}
                aria-label={isEditing ? "프로필 수정 취소" : "프로필 수정"}
              >
                {isEditing ? <Close /> : <EditOutlined />}
              </IconButton>
            </div>

            {isEditing ? (
              <form
                className={styles.profileEditForm}
                onSubmit={handleProfileSubmit}
              >
                <TextField
                  fullWidth
                  label="이름"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  required
                  variant="standard"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth
                  label="이메일"
                  type="email"
                  value={profileEmail}
                  onChange={(event) => setProfileEmail(event.target.value)}
                  required
                  variant="standard"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <div className={styles.profileActions}>
                  <Button
                    className={styles.continueButton}
                    type="submit"
                    disableRipple
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "저장 중..." : "변경 저장"}
                  </Button>
                  <Button
                    className={styles.cancelButton}
                    type="button"
                    disableRipple
                    disabled={isSavingProfile}
                    onClick={handleEditCancel}
                  >
                    취소
                  </Button>
                </div>
                {profileFeedback && (
                  <p
                    className={`${styles.profileFeedback} ${styles[profileFeedback.tone]}`}
                    role="status"
                  >
                    {profileFeedback.message}
                  </p>
                )}
              </form>
            ) : (
              <>
                <p className={styles.profileEmail}>
                  {user.email ?? "이메일 정보 없음"}
                </p>
                {isEditingPassword ? (
                  <form
                    className={styles.passwordEditForm}
                    onSubmit={handlePasswordSubmit}
                  >
                    <TextField
                      fullWidth
                      label="새 비밀번호"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      slotProps={{
                        htmlInput: { minLength: 8 },
                        inputLabel: { shrink: true },
                      }}
                      variant="standard"
                    />
                    <TextField
                      fullWidth
                      label="새 비밀번호 확인"
                      type="password"
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                      slotProps={{
                        htmlInput: { minLength: 8 },
                        inputLabel: { shrink: true },
                      }}
                      variant="standard"
                    />
                    <div className={styles.profileActions}>
                      <Button
                        className={styles.continueButton}
                        type="submit"
                        disableRipple
                        disabled={isSavingPassword}
                      >
                        {isSavingPassword ? "변경 중..." : "비밀번호 변경"}
                      </Button>
                      <Button
                        className={styles.cancelButton}
                        type="button"
                        disableRipple
                        disabled={isSavingPassword}
                        onClick={handlePasswordEditCancel}
                      >
                        취소
                      </Button>
                    </div>
                    {passwordFeedback && (
                      <p
                        className={`${styles.profileFeedback} ${styles[passwordFeedback.tone]}`}
                        role="alert"
                      >
                        {passwordFeedback.message}
                      </p>
                    )}
                  </form>
                ) : (
                  <Button
                    className={styles.passwordButton}
                    type="button"
                    disableRipple
                    disabled={isLoggingOut}
                    onClick={handlePasswordEditStart}
                  >
                    비밀번호 변경
                  </Button>
                )}
                <Button
                  className={styles.continueButton}
                  type="button"
                  disableRipple
                  disabled={isLoggingOut || isSavingPassword}
                  onClick={handleLogout}
                >
                  {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                </Button>
                {logoutError && (
                  <p className={styles.errorMessage} role="alert">
                    {logoutError}
                  </p>
                )}
                {profileFeedback && (
                  <p
                    className={`${styles.profileFeedback} ${styles[profileFeedback.tone]}`}
                    role="status"
                  >
                    {profileFeedback.message}
                  </p>
                )}
              </>
            )}
          </section>

          <section className={styles.accountLinks} aria-label="계정 메뉴">
            <Link href="/orders">
              <span>
                <small>01</small>
                주문 내역
              </span>
              <ArrowForward />
            </Link>
            <Link href="/wishlist">
              <span>
                <small>02</small>
                마음에 둔 상품
              </span>
              <ArrowForward />
            </Link>
            <Link href="/account/addresses">
              <span>
                <small>03</small>
                배송지 관리
              </span>
              <ArrowForward />
            </Link>
          </section>
        </div>

        <Button
          className={styles.continueButton}
          component={Link}
          href="/shop"
          disableRipple
          endIcon={<ArrowForward />}
        >
          쇼핑 계속하기
        </Button>
      </main>
    </div>
  );
}
