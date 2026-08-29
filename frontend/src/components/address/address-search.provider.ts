export type AddressSearchResult = {
  postalCode: string;
  addressLine1: string;
  addressType: "road" | "jibun";
};

export type AddressSearchCallbacks = {
  onComplete: (result: AddressSearchResult) => void;
  onError: (message: string) => void;
  onResize?: (height: number) => void;
};

export interface AddressSearchProvider {
  embed(
    container: HTMLElement,
    callbacks: AddressSearchCallbacks,
  ): () => void;
}

type KakaoAddressData = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
};

type KakaoPostcodeSize = {
  height: number;
};

type KakaoPostcode = {
  embed: (container: HTMLElement) => void;
};

type KakaoPostcodeConstructor = new (options: {
  oncomplete: (data: KakaoAddressData) => void;
  onresize?: (size: KakaoPostcodeSize) => void;
  width: string;
  height: string;
}) => KakaoPostcode;

declare global {
  interface Window {
    kakao?: {
      Postcode?: KakaoPostcodeConstructor;
    };
  }
}

function getSelectedAddress(data: KakaoAddressData) {
  const address =
    data.userSelectedType === "R"
      ? data.roadAddress || data.address
      : data.jibunAddress || data.address;

  return {
    address,
    addressType: data.userSelectedType === "R" ? "road" : "jibun",
  } as const;
}

export function createKakaoAddressSearchProvider(): AddressSearchProvider {
  return {
    embed(container, callbacks) {
      const Postcode = window.kakao?.Postcode;

      if (!Postcode) {
        callbacks.onError("주소 검색 서비스를 불러오지 못했어요.");
        return () => undefined;
      }

      container.replaceChildren();

      try {
        const postcode = new Postcode({
          width: "100%",
          height: "100%",
          oncomplete(data) {
            const selectedAddress = getSelectedAddress(data);

            if (!data.zonecode || !selectedAddress.address) {
              callbacks.onError("선택한 주소 정보를 확인하지 못했어요.");
              return;
            }

            callbacks.onComplete({
              postalCode: data.zonecode,
              addressLine1: selectedAddress.address,
              addressType: selectedAddress.addressType,
            });
          },
          onresize(size) {
            callbacks.onResize?.(size.height);
          },
        });

        postcode.embed(container);
      } catch {
        callbacks.onError("주소 검색 화면을 표시하지 못했어요.");
      }

      return () => {
        container.replaceChildren();
      };
    },
  };
}

export const addressSearchProvider = createKakaoAddressSearchProvider();
