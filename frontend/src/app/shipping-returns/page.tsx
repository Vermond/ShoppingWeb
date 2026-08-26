import { InfoPage } from "../../components/shop/InfoPage";

export default function ShippingReturnsPage() {
  return (
    <InfoPage
      eyebrow="Help / Delivery"
      title="배송과 교환."
      intro={
        <>
          물건이 새로운 자리를 찾는 과정도
          <br />
          편안하고 분명하게 안내할게요.
        </>
      }
      sections={[
        {
          title: "배송 안내",
          body: "주문 확인 후 영업일 기준 2~5일 이내에 출고됩니다.",
          points: [
            "3만원 이상 주문 시 배송비는 무료입니다.",
            "제주 및 도서산간 지역은 추가 운임이 발생할 수 있습니다.",
            "출고 후 배송 상태는 주문 내역에서 확인할 수 있습니다.",
          ],
        },
        {
          title: "교환 및 반품",
          body: "상품 수령 후 14일 이내에 문의해주세요.",
          points: [
            "사용 흔적이나 훼손이 없는 상품만 교환·반품이 가능합니다.",
            "단순 변심에 의한 배송비는 고객 부담입니다.",
            "맞춤 제작 및 위생 상품은 교환·반품이 제한될 수 있습니다.",
          ],
        },
        {
          title: "문의 방법",
          body: "주문 번호와 함께 문의 내용을 남겨주시면 확인 후 답변드릴게요.",
        },
      ]}
    />
  );
}
