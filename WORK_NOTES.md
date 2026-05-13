# Connect the dots — 작업 노트

## 배포
- **GitHub**: https://github.com/a01038137493-coder/ctd-landing
- **라이브**: https://ctd-main-nine.vercel.app (Vercel 자동 배포, `master` 푸시 시)
- **로컬**: `C:\Users\Administrator\ctd-landing\`
- **Git 브랜치**: master (단일 브랜치)

---

## 페이지 구성

| 경로 | 역할 | 톤 |
|------|------|------|
| `/` (index.html) | 메인 랜딩 (히어로/Pitch/Feature/제품/가격표) | 다크 + 오렌지 |
| `/shop.html` | 상품 그리드 (Supabase에서 동적 로드) | 다크 |
| `/product.html?id=<uuid>` | 상품 상세 (수량/장바구니/바로구매) | 다크 |
| `/cart.html` | 장바구니 (수량 조정/삭제) | 다크 |
| `/checkout.html` | 주문서 작성 → Supabase `orders` 저장 | 다크 |
| `/admin.html` | 상품 관리 어드민 (Supabase 인증) | 다크 |
| `/inspire.html` | INSPIRE 강의 랜딩 | **라이트** (흑백) |
| `/membership.html` | 멤버십 판매 랜딩 | 라이트 + 오렌지 액센트 |

---

## 백엔드 — Supabase

- **프로젝트 URL**: https://qfcgbiecvklkojjrxswe.supabase.co
- **테이블**:
  - `products` — 상품 (id uuid, name, image, price, price_was, badge, order, description)
  - `orders` — 주문 (id uuid, customer_*, items jsonb, total, status, created_at)
- **Storage 버킷**: `product-images` (Public)
- **RLS 정책**:
  - products: 누구나 SELECT / 인증 사용자만 INSERT·UPDATE·DELETE
  - orders: 누구나 INSERT (anon role) / 인증 사용자만 SELECT·UPDATE·DELETE
  - storage.objects: 모두 read, 인증 사용자만 write
- **관리자 계정**: Supabase Auth Users에 이메일/비밀번호로 등록
- **클라이언트 설정**: `js/supabase-config.js` 에 URL + anon key

### 알려진 함정
- anon role은 `orders` SELECT 권한 없음 → `.insert(...).select()` 호출 시 RLS 위반(`42501`). 따라서 `createOrder`는 클라이언트에서 UUID 생성 후 `.insert()`만 호출 (select 안 함).

---

## 프론트엔드 공유 모듈 (`/js/`)

| 파일 | 책임 |
|------|------|
| `supabase-config.js` | Supabase URL + anon key + bucket 이름 |
| `products.js` | `CTDProducts.{loadProducts, getProductById, saveProduct, deleteProduct, updateOrders, uploadImage, createOrder, signIn/signOut, subscribeChanges}` — Supabase 우선, localStorage 폴백 |
| `cart.js` | `CTDCart.{load, save, addItem, setQty, removeItem, clear, count, total, attachNavCount}` — localStorage 기반, `cart:change` 이벤트로 페이지 간 동기화 |

---

## 디자인 시스템

### 색
- **오렌지 액센트**: `#FF7A00` (메인/멤버십/shop·product/cart/checkout)
- **다크 배경**: `#000` / `#0D0D0D` / `#1A1A1A`
- **라이트 배경**: `#FFFFFF` / `#F9F7F4` / `#F6F6F6`
- INSPIRE는 **흑백 단일** (오렌지 없음)

### 강조 (`<em>`)
- 다크 페이지: 텍스트 색만 변경 또는 오렌지 박스
- INSPIRE 흑백: **검은 박스 + 흰 글자 (인버트)**, 일부는 italic
- 멤버십: 오렌지 박스
- 검은 배경 위에서는 흰 박스 + 검은 글자로 반전

### 챕터 마크 (inspire/membership)
```
─── 01 / PROBLEM ───
```
- `.chapter` 컴포넌트: 가는 선 + 번호 + `/` + 이름
- 번호 폰트는 Pretendard (SF Mono → Pretendard로 통일)

### Hero 모션 (inspire/membership)
- 등장: eyebrow → title → desc → stats → ctas 계단식 fade-up (0.15s 간격)
- 워터마크 텍스트(`INSPIRE`/`MEMBERSHIP`): 18s 주기 좌우 drift
- 멤버십 추가: 6s 주기 오렌지 글로우 breathing
- `prefers-reduced-motion: reduce` 대응

### Hero 스크롤 패럴랙스 (index)
- `rAF` 스로틀 + `transform: scale()` 사용 (letter-spacing 변경 → 매 프레임 reflow 문제 회피)
- `will-change` 힌트로 GPU 합성

---

## 이미지 (`/image/`)

| 파일 | 용도 |
|------|------|
| `정면책사진.jpg` | index hero 배경 |
| `feat01~04.png` | index Feature Grid 호버 사진 |
| `product01~04.jpg` | 기본 상품 표지 (shop 시드 데이터) |
| `book.png` | 멤버십 / 책 이미지 |
| `목업2.png` | index 멘토 섹션 채팅 목업 |
| `책만*.png` | 미사용 (보관) |
| `홈페이지 배너.jpg` | 미사용 (보관) |

> 이미지 업로드는 admin.html에서 직접 → Supabase Storage `product-images` 버킷에 저장됨. `/image/` 폴더는 정적 자산만.

---

## 흐름

### 구매 흐름
shop.html → product.html?id=… → 장바구니 담기 / 바로구매 → cart.html → 주문하기 → checkout.html → 주문 완료 (Supabase orders insert)

### 어드민 흐름
admin.html → Supabase Auth 로그인 → 상품 CRUD (드래그 정렬, 이미지 업로드 base64 또는 URL) → 결과는 shop.html에 **실시간 반영** (postgres_changes 구독)

---

## 미완성 / 대기

- **결제 게이트웨이** (PortOne / 토스 / 카카오페이) — 현재는 주문서 저장만, 결제는 별도 안내 문구
- **어드민에 주문 관리 탭** — 현재 orders는 Supabase Table Editor에서 직접 봐야 함
- **product05 (실전모의고사)** — index의 마지막 제품 카드, 표지 이미지 미수령
- **멘토 섹션 아바타** — 회색 박스 "이미지" 플레이스홀더
- **가격표 노트 박스** — "텍스트를 입력하세요" 더미
- **상품 바로가기 버튼 href** (index) — `#`, shop과 연결 필요
- **About 페이지** — nav에 링크 있으나 페이지 없음 (`/#`)
- **INSPIRE OT 영상** — placeholder, 실제 YouTube embed 필요
- **회원 시스템** — 비로그인 주문만 가능, 회원가입/마이페이지 없음

---

## 자주 쓰는 명령

```
# 변경사항 푸시
git add -A
git commit -m "메시지"
git push origin master
```

> Vercel은 GitHub master 푸시 시 자동 배포 (~1-2분)

---

## 스택
- **HTML/CSS/JS** 인라인 (페이지별 단일 파일 + `js/`에 공유 모듈 3개)
- **폰트**: Pretendard (CDN)
- **백엔드**: Supabase (Postgres + Auth + Storage + Realtime)
- **배포**: Vercel (GitHub 연동 자동)
