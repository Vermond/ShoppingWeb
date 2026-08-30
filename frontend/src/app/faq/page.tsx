import { InfoPage } from "../../components/shop/InfoPage";

export default function FaqPage() {
  return (
    <InfoPage
      eyebrow="Help / FAQ"
      title="자주 묻는 질문."
      intro={
        <>
          쇼핑하면서 궁금한 점을 모아두었어요.
          <br />
          더 필요한 답이 있다면 문의해주세요.
        </>
      }
      collapsible
      sections={[
        {
          title: "주문 후 배송은 얼마나 걸리나요?",
          body: "주문 확인 후 영업일 기준 2~5일 이내에 배송됩니다.",
        },
          {
            title: "배송비는 얼마인가요?",
            body: "배송비는 현재 배송 정책과 주문 금액을 기준으로 계산되며, 주문 전 결제 화면에서 확인할 수 있어요.",
          },
        {
          title: "상품을 교환하고 싶어요.",
          body: "수령 후 14일 이내에 문의해주시면 교환 절차를 안내해드려요.",
        },
        {
          title: "로그인 없이도 주문할 수 있나요?",
          body: "현재는 회원 주문을 기준으로 준비하고 있습니다. 비회원 주문은 서버 연결 후 지원할 예정입니다.",
        },
      ]}
    />
  );
}
