"use client";

import {
  Add,
  ArrowBack,
  Delete,
  EditOutlined,
} from "@mui/icons-material";
import {
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
} from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { AddressSearchDialog } from "../../../components/address/AddressSearchDialog";
import type { AddressSearchResult } from "../../../components/address/address-search.provider";
import { useAuth } from "../../../components/auth/AuthProvider";
import { useCart } from "../../../components/shop/CartProvider";
import { SiteHeader } from "../../../components/shop/SiteHeader";
import {
  createUserAddress,
  deleteUserAddress,
  requestUserAddresses,
  updateUserAddress,
  type UserAddress,
} from "../../../repositories/user-details.repository";
import {
  getCurrentReturnTo,
  getLoginPath,
} from "../../../utils/auth-redirect";
import accountStyles from "../page.module.css";
import styles from "./page.module.css";

type AddressForm = {
  recipientName: string;
  phoneNumber: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  isDefault: boolean;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

const emptyAddressForm: AddressForm = {
  recipientName: "",
  phoneNumber: "",
  postalCode: "",
  addressLine1: "",
  addressLine2: "",
  isDefault: false,
};

function getAddressForm(address: UserAddress): AddressForm {
  return {
    recipientName: address.recipientName,
    phoneNumber: address.phoneNumber,
    postalCode: address.postalCode,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    isDefault: address.isDefault,
  };
}

function formatAddress(address: UserAddress) {
  return `(${address.postalCode}) ${address.addressLine1}`;
}

function getSafeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function AddressesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuth();
  const { totalItems } = useCart();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const [query, setQuery] = useState("");
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(
    null,
  );
  const [form, setForm] = useState<AddressForm>(emptyAddressForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserAddress | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(
        getLoginPath(getCurrentReturnTo("/account/addresses")),
      );
    }
  }, [router, status]);

  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await requestUserAddresses();
      setAddresses(result);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "배송지 목록을 불러오지 못했어요.",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const loadId = window.setTimeout(() => {
      void loadAddresses();
    }, 0);

    return () => window.clearTimeout(loadId);
  }, [loadAddresses, status]);

  const openCreateDialog = () => {
    setEditingAddress(null);
    setForm({ ...emptyAddressForm, isDefault: addresses.length === 0 });
    setFeedback(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (address: UserAddress) => {
    setEditingAddress(address);
    setForm(getAddressForm(address));
    setFeedback(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSaving) {
      return;
    }

    setIsDialogOpen(false);
  };

  const updateForm = <K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleAddressSearchComplete = (result: AddressSearchResult) => {
    updateForm("postalCode", result.postalCode);
    updateForm("addressLine1", result.addressLine1);
    updateForm("addressLine2", "");
    setIsAddressSearchOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      recipientName: form.recipientName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      postalCode: form.postalCode.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() || null,
      isDefault: form.isDefault,
    };

    if (
      !payload.recipientName ||
      !payload.phoneNumber ||
      !payload.postalCode ||
      !payload.addressLine1
    ) {
      setFeedback({
        tone: "error",
        message: "필수 배송지 정보를 입력해주세요.",
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      if (editingAddress) {
        await updateUserAddress(editingAddress.id, payload);
      } else {
        await createUserAddress(payload);
      }

      const didReload = await loadAddresses();

      if (!didReload) {
        setFeedback({
          tone: "error",
          message: "저장되었지만 배송지 목록을 새로 불러오지 못했어요.",
        });
        return;
      }

      setIsDialogOpen(false);
      setFeedback({
        tone: "success",
        message: editingAddress
          ? "배송지가 수정되었어요."
          : "배송지가 추가되었어요.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "배송지를 저장하지 못했어요.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = (address: UserAddress) => {
    setPendingDelete(address);
  };

  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setPendingDelete(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    try {
      await deleteUserAddress(pendingDelete.id);
      const didReload = await loadAddresses();

      if (didReload) {
        setFeedback({
          tone: "success",
          message: "배송지가 삭제되었어요.",
        });
      }
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "배송지를 삭제하지 못했어요.",
      });
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
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

  if (status !== "authenticated") {
    return (
      <div className={accountStyles.accountPage}>
        {siteHeader}
        {status === "loading" && (
          <main className={accountStyles.accountMain}>
            <p className={accountStyles.loadingMessage}>
              로그인 정보를 확인하는 중...
            </p>
          </main>
        )}
      </div>
    );
  }

  return (
    <div className={accountStyles.accountPage}>
      {siteHeader}

      <main className={accountStyles.accountMain}>
        <section className={accountStyles.accountHero} aria-labelledby="addresses-title">
          <p className={accountStyles.eyebrow}>Delivery</p>
          <h1 id="addresses-title">배송지 관리.</h1>
          <p>자주 쓰는 배송지를 저장하고 편하게 선택하세요.</p>
        </section>

        <div className={styles.addressToolbar}>
          <Button
            className={accountStyles.continueButton}
            component={Link}
            href={returnTo ?? "/account"}
            startIcon={<ArrowBack />}
            disableRipple
          >
            {returnTo ? "주문으로 돌아가기" : "계정으로 돌아가기"}
          </Button>
          <Button
            className={styles.addAddressButton}
            variant="contained"
            disableRipple
            startIcon={<Add />}
            onClick={openCreateDialog}
          >
            배송지 추가
          </Button>
        </div>

        {feedback && (
          <p
            className={`${styles.feedback} ${styles[feedback.tone]}`}
            role="status"
          >
            {feedback.message}
          </p>
        )}

        <section className={styles.addressSection} aria-label="배송지 목록">
          {isLoading ? (
            <p className={accountStyles.loadingMessage}>
              배송지 목록을 불러오는 중...
            </p>
          ) : errorMessage ? (
            <div className={styles.emptyState}>
              <p className={accountStyles.errorMessage}>{errorMessage}</p>
              <Button
                className={accountStyles.continueButton}
                type="button"
                disableRipple
                onClick={() => void loadAddresses()}
              >
                다시 시도
              </Button>
            </div>
          ) : addresses.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>저장된 배송지가 없어요.</h2>
              <p>배송지를 저장하면 다음 주문부터 더 빠르게 입력할 수 있어요.</p>
              <Button
                className={accountStyles.continueButton}
                type="button"
                disableRipple
                startIcon={<Add />}
                onClick={openCreateDialog}
              >
                첫 배송지 추가
              </Button>
            </div>
          ) : (
            <div className={styles.addressList}>
              <div className={styles.addressListHeader}>
                <h2>저장된 배송지</h2>
                <span>{addresses.length} places</span>
              </div>

              {addresses.map((address) => (
                <article className={styles.addressCard} key={address.id}>
                  <div className={styles.addressCardHeader}>
                    <div>
                      <h3>{address.recipientName}</h3>
                      {address.isDefault && (
                        <Chip
                          className={styles.defaultChip}
                          label="기본 배송지"
                          size="small"
                          sx={{ borderRadius: 0 }}
                        />
                      )}
                    </div>
                    <div className={styles.addressCardActions}>
                      <IconButton
                        type="button"
                        size="small"
                        disableRipple
                        onClick={() => openEditDialog(address)}
                        aria-label={`${address.recipientName} 배송지 수정`}
                      >
                        <EditOutlined />
                      </IconButton>
                      <IconButton
                        type="button"
                        size="small"
                        disableRipple
                        onClick={() => requestDelete(address)}
                        aria-label={`${address.recipientName} 배송지 삭제`}
                      >
                        <Delete />
                      </IconButton>
                    </div>
                  </div>
                  <p className={styles.addressLine}>{formatAddress(address)}</p>
                  {address.addressLine2 && (
                    <p className={styles.addressLine}>{address.addressLine2}</p>
                  )}
                  <p className={styles.addressPhone}>{address.phoneNumber}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog
        open={isDialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        disableScrollLock
        aria-labelledby="address-dialog-title"
      >
        <DialogTitle id="address-dialog-title">
          {editingAddress ? "배송지 수정" : "배송지 추가"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <div className={styles.addressFormGrid}>
              <TextField
                label="수령인"
                value={form.recipientName}
                onChange={(event) =>
                  updateForm("recipientName", event.target.value)
                }
                required
                fullWidth
                variant="standard"
              />
              <TextField
                label="연락처"
                type="tel"
                value={form.phoneNumber}
                onChange={(event) =>
                  updateForm("phoneNumber", event.target.value)
                }
                required
                fullWidth
                variant="standard"
              />
              <div className={styles.postalCodeField}>
                <TextField
                  className={styles.addressLockedField}
                  label="우편번호"
                  value={form.postalCode}
                  disabled
                  required
                  fullWidth
                  variant="standard"
                />
                <Button
                  className={styles.addressSearchButton}
                  type="button"
                  variant="outlined"
                  disableRipple
                  onClick={() => setIsAddressSearchOpen(true)}
                >
                  주소 검색
                </Button>
              </div>
              <TextField
                className={`${styles.addressWideField} ${styles.addressLockedField}`}
                label="주소"
                value={form.addressLine1}
                disabled
                required
                fullWidth
                variant="standard"
              />
              <TextField
                className={styles.addressWideField}
                label="상세 주소"
                value={form.addressLine2}
                onChange={(event) =>
                  updateForm("addressLine2", event.target.value)
                }
                fullWidth
                variant="standard"
              />
            </div>
            <FormControlLabel
              className={styles.defaultCheckbox}
              control={
                <Checkbox
                  checked={form.isDefault}
                  onChange={(event) =>
                    updateForm("isDefault", event.target.checked)
                  }
                  disabled={Boolean(
                    editingAddress?.isDefault && addresses.length === 1,
                  )}
                />
              }
              label="기본 배송지로 설정"
            />
            {feedback && (
              <p
                className={`${styles.feedback} ${styles[feedback.tone]}`}
                role="alert"
              >
                {feedback.message}
              </p>
            )}
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={closeDialog} disabled={isSaving}>
              취소
            </Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <AddressSearchDialog
        open={isAddressSearchOpen}
        onClose={() => setIsAddressSearchOpen(false)}
        onComplete={handleAddressSearchComplete}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={closeDeleteDialog}
        disableScrollLock
        aria-labelledby="delete-address-title"
        aria-describedby="delete-address-description"
      >
        <DialogTitle id="delete-address-title">
          배송지를 삭제하시겠습니까?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-address-description">
            {pendingDelete?.recipientName} 배송지를 삭제합니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={isDeleting}>
            취소
          </Button>
          <Button
            onClick={() => void confirmDelete()}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default function AddressesPage() {
  return (
    <Suspense fallback={null}>
      <AddressesPageContent />
    </Suspense>
  );
}
