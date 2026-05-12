# CTD Main Page — 작업 노트

## 배포
- **URL**: https://ctd-main-nine.vercel.app
- **배포 명령**: `vercel deploy --prod --scope roys-projects-688ae348`
- **로컬 경로**: `C:\Users\a0103\ctd-main\`

---

## 섹션 순서 (현재 확정)

| 순서 | 섹션 | 클래스 | 배경 |
|------|------|--------|------|
| 1 | Hero | `.hero` | `정면책사진.jpg` (center 15%) |
| 2 | Pitch | `.pitch` | `#0D0D0D` |
| 3 | 절대평가 | `.split-sec` | `#fff` |
| 4 | Feature Grid | `.fgrid` | `#111` |
| 5 | 영상 해설 | `.video-sec` | `#111` |
| 6 | 멘토 채팅 | `.mentor-sec` | `#fff` |
| 7 | 교재 목록 | `.products-sec` | `#0D0D0D` |
| 8 | 가격표 | `.price-table` | `#0D0D0D` |
| 9 | Footer | `footer` | `#111` |

---

## 이미지 파일 (`/image/`)

| 파일명 | 용도 |
|--------|------|
| `정면책사진.jpg` | 히어로 배경 |
| `feat01~04.png` | Feature Grid 호버 사진 |
| `product01.jpg` | Trigger 표지 |
| `product02.jpg` | IP 표지 |
| `product03.jpg` | IP GRAMMAR 표지 |
| `product04.jpg` | RC 표지 |
| `템플릿.png` | 영상 섹션 태블릿 목업 (18MB) |
| `책만3_clean.png` | 미사용 (보관) |
| `홈페이지 배너.jpg` | 미사용 (보관) |

---

## 미완성 / 대기 항목

- **product05** (실전모의고사) — 표지 이미지 미수령, `product-cover-empty` 플레이스홀더 상태
- **멘토 섹션 아바타** — 회색 박스 "이미지" 플레이스홀더, 실제 이미지 교체 필요
- **가격표 노트 박스** — 두 카드 모두 "텍스트를 입력하세요" → 실제 문구 확정 후 교체
- **상품 바로가기 버튼** href — 현재 전부 `#`, 실제 링크 연결 필요
- **태블릿 배너 이미지** (`템플릿.png`) — 18MB 대용량, 로딩 느릴 수 있음. 최적화 권장

---

## 주요 기능 / 인터랙션

### 가격 슬롯머신 (Pitch 섹션)
- 스크롤 진입 시 `15,900` 각 자릿수가 0-9를 3바퀴 돌고 착지
- JS: `initPriceSlots()` 함수, `IntersectionObserver` 트리거
- CSS 클래스: `.slot-cell`, `.slot-reel`, `.slot-comma`

### 제품 카드 호버 확장 (Products 섹션)
- 호버 시 해당 카드 `flex: 3.6`, 나머지 `flex: 0.55`
- 확장 카드에 상세 설명 + "상품으로 바로가기 →" 버튼 노출
- JS: `.products-grid` mouseleave로 리셋
- 이미지: `transform: none !important` — 스케일 효과 없음

### Feature Grid 호버
- 기본: `rgba(0,0,0,.72)` 오버레이 (사진 어둡게)
- 호버: `rgba(0,0,0,.35)` (사진 밝아짐)
- `::after` pseudo-element로 오버레이 구현 (z-index: 1)
- `.fgrid-content` z-index: 2

### 스크롤 패럴랙스 (Hero)
- `heroText`: translateY + opacity + blur + letterSpacing
- `heroTagline`: opacity + translateY
- `window.addEventListener('scroll', onScroll, { passive: true })`

---

## 영상 배너 오버레이
```css
.video-banner::after { background: rgba(0,0,0,.65); }
```
- `.video-banner-left`, `.video-banner-right`: z-index: 2

---

## 스택 / 환경
- **단일 파일**: `index.html` (HTML + CSS + JS 인라인)
- **폰트**: Pretendard (CDN)
- **배포**: Vercel CLI (`vercel` 명령)
- **Git 브랜치**: master
- **Python 환경**: PyMuPDF(`fitz`) 설치됨 — PDF → JPG 변환용
