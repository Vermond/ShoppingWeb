# 데이터베이스 초기화·마이그레이션·시드 정책

## 기준

`backend/sql/000_initial_schema.sql`은 현재 애플리케이션이 사용하는 최종 테이블
구조를 신규 데이터베이스에 생성하는 기준 스키마이다. 이후 번호가 붙은 SQL은 현재
기준 스키마를 완성하는 변경 마이그레이션이다.

마이그레이션은 이미 적용된 파일명을 `public.schema_migrations`에 기록한다. 각 파일은
개별 트랜잭션으로 실행되며 PostgreSQL advisory lock으로 동시에 두 번 실행되지 않도록
한다.

## 명령

`backend` 디렉터리에서 실행한다.

```bash
npm run db:migrate
npm run db:seed
```

시드 파일은 반복 실행할 수 있도록 작성한다. 현재 기본 시드는 활성 배송 정책이 없을
때 `base_fee = 3000.00`, `free_threshold = 50000.00`인 정책을 하나 생성한다.

개발 환경에서 관리자 로그인이 필요하면 아래 환경변수를 설정한 뒤 시드를 실행할
수 있다. 비밀번호는 애플리케이션과 같은 scrypt 형식으로 해시되어 저장되며, 이미
같은 이메일이 있으면 덮어쓰지 않는다.

```text
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_NAME=Administrator
SEED_ADMIN_PASSWORD=개발용_비밀번호
```

이 값은 저장소에 커밋하지 않으며 운영 환경에서는 사용하지 않는다. 카테고리와 상품은
업무 데이터가 정해지지 않았으므로 임의로 시드하지 않는다.

## 데이터베이스 초기화

현재 개발 DB의 데이터를 보존하지 않고 애플리케이션 관리 스키마를 재구성할 때만
다음 명령을 사용한다.

```bash
npm run db:reset -- --confirm
```

이 명령은 `auth`, `catalog`, `cart`, `sales`, `wishlist` 스키마와 그 안의 데이터를
삭제한 뒤 마이그레이션과 시드를 순서대로 실행한다. `public` 스키마 전체는 삭제하지
않으며, 마이그레이션 기록 테이블인 `public.schema_migrations`만 삭제한다.

실행 전 `DATABASE_URL`이 초기화해도 되는 개발용 PostgreSQL을 가리키는지 확인해야
한다. 운영 데이터에는 사용하지 않는다.

## 마이그레이션 파일 규칙

- 파일명은 `NNN_description.sql` 형식으로 작성한다.
- 새 파일은 기존 번호와 중복되지 않아야 한다.
- 가능한 경우 `IF NOT EXISTS`를 사용해 재실행에 안전하게 작성한다.
- 테이블·컬럼 변경과 관련 인덱스는 같은 변경의 의도와 순서를 문서화한다.
- 개발용 기본 데이터는 `backend/sql/seeds`에 두고 스키마 마이그레이션과 분리한다.

현재 초기 스키마는 실제 데이터를 복구하기 위한 백업이 아니다. 운영 적용 전에는
별도 백업·롤백 절차와 운영 시드 값을 준비해야 한다.

## 실제 DB 통합 테스트

mock 기반 테스트와 별도로 실제 PostgreSQL에 SQL을 실행하는 통합 테스트를 제공한다.
통합 테스트는 개발 DB와 반드시 별도의 데이터베이스를 사용한다. 테스트 실행 중
사용자·상품·주문 데이터를 생성하므로 `INTEGRATION_DB_ALLOW_WRITES=true`를 명시해야
하며, 연결 대상 데이터베이스 이름에는 `test`, `integration`, `ci` 중 하나가 포함되어야
한다. `DATABASE_URL`과 같은 데이터베이스를 지정하면 테스트가 시작되지 않는다.

```text
INTEGRATION_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/shopping_test
INTEGRATION_DB_ALLOW_WRITES=true
```

`shopping_test`는 개발 DB가 아닌 별도 테스트 DB여야 한다. 테스트 DB를 준비한 뒤
다음 순서로 실행한다. 마이그레이션·시드는 지정한 통합 테스트 DB에만 적용된다.

```bash
npm run db:migrate:integration
npm run db:seed:integration
npm run test:integration
```

통합 테스트는 테스트용으로 생성한 행만 식별해 삭제하며 애플리케이션 스키마 전체를
삭제하거나 `db:reset`을 호출하지 않는다. 테스트 DB를 새로 만들거나 제거하는 작업은
별도의 PostgreSQL 관리 절차로 수행한다.
