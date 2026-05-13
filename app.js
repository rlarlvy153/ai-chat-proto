const mobileScreen = document.querySelector(".mobile-screen");
const carousel = document.querySelector(".carousel");
const track = document.querySelector(".track");
const gestureHint = document.querySelector(".gesture-hint");
const tabPanels = document.querySelectorAll("[data-tab-panel]");
const bottomTabs = document.querySelectorAll(".bottom-tab");
const chatListItems = document.querySelector(".chat-list-items");
const chatBack = document.querySelector(".chat-back");
const chatAvatar = document.querySelector(".chat-avatar");
const chatName = document.querySelector(".chat-name");
const chatMessages = document.querySelector(".chat-messages");
const chatComposer = document.querySelector(".chat-composer");
const chatInput = document.querySelector(".chat-input");
const idols = window.APP_DATA.idols;
const realSlideCount = idols.length;
const photoIndexes = idols.map(() => 0);
const chatHistories = idols.map((idol) => [
  {
    from: "idol",
    text: `안녕하세요. ${idol.name}입니다. 오늘은 어떤 이야기를 나눠볼까요?`,
  },
  {
    from: "user",
    text: "방금 프로필을 보고 왔어요. 분위기가 좋네요.",
  },
  {
    from: "idol",
    text: "그렇게 말해주시니 기분이 좋아요. 천천히 이야기해도 괜찮아요.",
  },
  {
    from: "idol",
    text: "궁금한 게 있으면 편하게 물어봐 주세요.",
  },
]);
let activeChatIndex = 0;
const startedChatIndexes = [];

let isDragging = false;
let startX = 0;
let currentIndex = 1;
let currentOffset = 0;
let dragOffset = 0;
let activeScrollPanel = null;
let scrollStartY = 0;
let scrollStartTop = 0;

function createSlide(idol, idolIndex) {
  const slide = document.createElement("article");
  slide.className = "slide";
  slide.dataset.idolIndex = idolIndex;
  slide.innerHTML = `
    <img
      class="portrait"
      src="${idol.photos[photoIndexes[idolIndex]]}"
      alt="${idol.name} 인물 사진"
      draggable="false"
    />
    <div
      class="photo-indicator"
      style="--photo-count: ${idol.photos.length}"
      aria-label="${idol.name} 사진 위치"
    >
      ${idol.photos
        .map(
          (_, photoIndex) =>
            `<span class="${photoIndex === photoIndexes[idolIndex] ? "is-active" : ""}"></span>`,
        )
        .join("")}
    </div>
    <div class="profile" aria-label="${idol.name} 프로필">
      <img
        class="profile-avatar"
        src="${idol.avatar}"
        alt=""
        draggable="false"
      />
      <div class="profile-copy">
        <span class="profile-name">${idol.name}</span>
        <span class="profile-greeting">${idol.greeting}</span>
      </div>
      <div class="profile-actions" aria-label="${idol.name} 액션">
        <button class="profile-button primary" data-action="chat" type="button">채팅하기</button>
        <button class="profile-button" data-action="intro" type="button">소개보기</button>
      </div>
    </div>
    <section class="intro-panel" aria-label="${idol.name} 소개">
      <span class="intro-kicker">Profile</span>
      <h2 class="intro-title">${idol.name}</h2>
      <dl class="intro-details">
        <div class="intro-detail">
          <dt>이름</dt>
          <dd>${idol.name}</dd>
        </div>
        <div class="intro-detail">
          <dt>소개</dt>
          <dd>${idol.profile.intro}</dd>
        </div>
        <div class="intro-detail">
          <dt>신체프로필</dt>
          <dd>${idol.profile.bodyProfile}</dd>
        </div>
        <div class="intro-detail">
          <dt>음주</dt>
          <dd>${idol.profile.drinking}</dd>
        </div>
        <div class="intro-detail">
          <dt>흡연</dt>
          <dd>${idol.profile.smoking}</dd>
        </div>
        <div class="intro-detail">
          <dt>별자리</dt>
          <dd>${idol.profile.zodiac}</dd>
        </div>
        <div class="intro-detail">
          <dt>학력</dt>
          <dd>${idol.profile.education}</dd>
        </div>
        <div class="intro-detail">
          <dt>직업</dt>
          <dd>${idol.profile.job}</dd>
        </div>
        <div class="intro-detail">
          <dt>성격</dt>
          <dd>${idol.profile.personality}</dd>
        </div>
        <div class="intro-detail">
          <dt>라이프스타일<br />관심사</dt>
          <dd>${idol.profile.lifestyle}</dd>
        </div>
      </dl>
    </section>
  `;
  return slide;
}

function updatePhoto(idolIndex) {
  const idol = idols[idolIndex];
  const photo = idol.photos[photoIndexes[idolIndex]];
  const slides = track.querySelectorAll(`[data-idol-index="${idolIndex}"]`);

  slides.forEach((slide) => {
    const portrait = slide.querySelector(".portrait");
    const indicatorBars = slide.querySelectorAll(".photo-indicator span");
    portrait.src = photo;
    portrait.alt = `${idol.name} 인물 사진`;
    indicatorBars.forEach((bar, index) => {
      bar.classList.toggle("is-active", index === photoIndexes[idolIndex]);
    });
  });
}

function changeCurrentPhoto(direction) {
  const realIndex = getRealIndex();
  const photos = idols[realIndex].photos;
  photoIndexes[realIndex] =
    (photoIndexes[realIndex] + direction + photos.length) % photos.length;
  updatePhoto(realIndex);
}

function hideGestureHint() {
  gestureHint.classList.add("is-hidden");
}

function preloadPortraits() {
  const imageSources = new Set(
    idols.flatMap((idol) => [idol.avatar, ...idol.photos]),
  );

  imageSources.forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}

function setActiveTab(tabName) {
  tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tabName);
  });

  bottomTabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });

  if (tabName === "chats") {
    renderChatList();
  }
}

function markChatStarted(idolIndex) {
  const previousIndex = startedChatIndexes.indexOf(idolIndex);

  if (previousIndex !== -1) {
    startedChatIndexes.splice(previousIndex, 1);
  }

  startedChatIndexes.unshift(idolIndex);
}

function getLastMessage(idolIndex) {
  const history = chatHistories[idolIndex];
  return history[history.length - 1];
}

function renderChatList() {
  chatListItems.replaceChildren();

  if (startedChatIndexes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "chat-empty";
    empty.textContent =
      "아직 시작된 채팅이 없습니다. 친구찾기에서 채팅하기를 눌러보세요.";
    chatListItems.appendChild(empty);
    return;
  }

  startedChatIndexes.forEach((idolIndex) => {
    const idol = idols[idolIndex];
    const lastMessage = getLastMessage(idolIndex);
    const item = document.createElement("button");
    const avatar = document.createElement("img");
    const copy = document.createElement("span");
    const row = document.createElement("span");
    const name = document.createElement("span");
    const time = document.createElement("span");
    const preview = document.createElement("span");

    item.className = "chat-list-item";
    item.type = "button";
    item.dataset.idolIndex = String(idolIndex);
    avatar.className = "chat-list-avatar";
    avatar.src = idol.avatar;
    avatar.alt = "";
    avatar.draggable = false;
    copy.className = "chat-list-copy";
    row.className = "chat-list-row";
    name.className = "chat-list-name";
    name.textContent = idol.name;
    time.className = "chat-list-time";
    time.textContent = "방금";
    preview.className = "chat-list-preview";
    preview.textContent = lastMessage.text;

    row.append(name, time);
    copy.append(row, preview);
    item.append(avatar, copy);
    chatListItems.appendChild(item);
  });
}

function appendMessage(message) {
  const item = document.createElement("div");
  item.className = `chat-message ${
    message.from === "user" ? "is-user" : ""
  }`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = message.text;
  item.appendChild(bubble);
  chatMessages.appendChild(item);
}

function renderChat(idolIndex) {
  const idol = idols[idolIndex];
  chatAvatar.src = idol.avatar;
  chatName.textContent = idol.name;
  chatMessages.replaceChildren();
  chatHistories[idolIndex].forEach(appendMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function openChat(idolIndex) {
  activeChatIndex = idolIndex;
  markChatStarted(idolIndex);
  closeIntroPanels();
  setActiveTab("chats");
  renderChat(idolIndex);
  mobileScreen.classList.add("is-chatting");
  chatInput.focus();
}

function closeChat() {
  mobileScreen.classList.remove("is-chatting");
  chatInput.value = "";
  setActiveTab("chats");
}

function closeIntroPanels() {
  track.querySelectorAll(".slide").forEach((slide) => {
    slide.classList.remove("is-intro-open");
    const introButton = slide.querySelector('[data-action="intro"]');

    if (introButton) {
      introButton.textContent = "소개보기";
    }
  });
}

function setIntroOpen(idolIndex, isOpen) {
  track.querySelectorAll(".slide").forEach((slide) => {
    const shouldOpen =
      Number(slide.dataset.idolIndex) === idolIndex && isOpen;
    slide.classList.toggle("is-intro-open", shouldOpen);

    const introButton = slide.querySelector('[data-action="intro"]');

    if (introButton) {
      introButton.textContent = shouldOpen ? "소개닫기" : "소개보기";
    }
  });
}

track.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".profile-button, .intro-panel")) {
    hideGestureHint();
    event.stopPropagation();
  }
});

track.addEventListener("pointerdown", (event) => {
  const introPanel = event.target.closest(".intro-panel");

  if (!introPanel || event.button > 0) return;

  activeScrollPanel = introPanel;
  scrollStartY = event.clientY;
  scrollStartTop = introPanel.scrollTop;
  introPanel.classList.add("is-drag-scrolling");
  introPanel.setPointerCapture(event.pointerId);
  event.stopPropagation();
});

track.addEventListener("pointermove", (event) => {
  if (!activeScrollPanel) return;

  event.preventDefault();
  event.stopPropagation();
  activeScrollPanel.scrollTop = scrollStartTop - (event.clientY - scrollStartY);
});

function stopIntroPanelScroll(event) {
  if (!activeScrollPanel) return;

  activeScrollPanel.classList.remove("is-drag-scrolling");

  if (activeScrollPanel.hasPointerCapture(event.pointerId)) {
    activeScrollPanel.releasePointerCapture(event.pointerId);
  }

  activeScrollPanel = null;
  event.stopPropagation();
}

track.addEventListener("click", (event) => {
  const button = event.target.closest(".profile-button");

  if (!button) return;

  event.stopPropagation();

  const slide = button.closest(".slide");
  const idolIndex = Number(slide.dataset.idolIndex);

  if (button.dataset.action === "chat") {
    openChat(idolIndex);
    return;
  }

  if (button.dataset.action !== "intro") return;

  const willOpen = !slide.classList.contains("is-intro-open");
  setIntroOpen(idolIndex, willOpen);
});

bottomTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    mobileScreen.classList.remove("is-chatting");
    closeIntroPanels();
    setActiveTab(tab.dataset.tab);
  });
});

chatListItems.addEventListener("click", (event) => {
  const item = event.target.closest(".chat-list-item");

  if (!item) return;

  openChat(Number(item.dataset.idolIndex));
});

function buildSlides() {
  idols.forEach((idol, index) => track.appendChild(createSlide(idol, index)));

  const slides = Array.from(track.children);
  const firstClone = slides[0].cloneNode(true);
  const lastClone = slides[slides.length - 1].cloneNode(true);

  firstClone.setAttribute("aria-hidden", "true");
  lastClone.setAttribute("aria-hidden", "true");
  track.insertBefore(lastClone, slides[0]);
  track.appendChild(firstClone);
}

function moveTrack(offset) {
  track.style.transform = `translate3d(${offset}px, 0, 0)`;
}

function getRealIndex() {
  if (currentIndex <= 0) return realSlideCount - 1;
  if (currentIndex >= realSlideCount + 1) return 0;
  return currentIndex - 1;
}

function jumpTo(index) {
  track.style.transition = "none";
  currentIndex = index;
  currentOffset = -currentIndex * carousel.clientWidth;
  dragOffset = currentOffset;
  moveTrack(currentOffset);
  track.getBoundingClientRect();
  track.style.transition = "";
}

function slideTo(index) {
  currentIndex = Math.max(0, Math.min(realSlideCount + 1, index));
  currentOffset = -currentIndex * carousel.clientWidth;
  dragOffset = currentOffset;
  moveTrack(currentOffset);
}

function normalizeLoopPosition() {
  if (currentIndex <= 0) {
    jumpTo(realSlideCount);
  }

  if (currentIndex >= realSlideCount + 1) {
    jumpTo(1);
  }
}

preloadPortraits();
buildSlides();
jumpTo(currentIndex);
renderChatList();

carousel.addEventListener("pointerdown", (event) => {
  normalizeLoopPosition();
  isDragging = true;
  startX = event.clientX;
  dragOffset = currentOffset;
  hideGestureHint();
  carousel.classList.add("is-dragging");
  carousel.setPointerCapture(event.pointerId);
});

carousel.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  event.preventDefault();
  const distance = event.clientX - startX;
  const slideWidth = carousel.clientWidth;
  const minOffset = -(currentIndex + 1) * slideWidth;
  const maxOffset = -(currentIndex - 1) * slideWidth;
  const nextOffset = currentOffset + distance;
  dragOffset = Math.max(minOffset, Math.min(maxOffset, nextOffset));
  moveTrack(dragOffset);
});

function stopDragging(event) {
  if (!isDragging) return;

  isDragging = false;
  carousel.classList.remove("is-dragging");

  const distance = event.clientX - startX;
  const clickThreshold = 8;
  const swipeThreshold = 28;

  if (Math.abs(distance) <= clickThreshold) {
    const rect = carousel.getBoundingClientRect();
    const direction = event.clientX < rect.left + rect.width / 2 ? -1 : 1;
    slideTo(currentIndex);
    changeCurrentPhoto(direction);
  } else if (Math.abs(distance) > swipeThreshold) {
    const targetIndex = distance < 0 ? currentIndex + 1 : currentIndex - 1;
    closeIntroPanels();
    slideTo(targetIndex);
  } else {
    slideTo(currentIndex);
  }

  if (carousel.hasPointerCapture(event.pointerId)) {
    carousel.releasePointerCapture(event.pointerId);
  }
}

track.addEventListener("transitionend", (event) => {
  if (event.propertyName === "transform") {
    normalizeLoopPosition();
  }
});
track.addEventListener("pointerup", stopIntroPanelScroll);
track.addEventListener("pointercancel", stopIntroPanelScroll);

carousel.addEventListener("pointerup", stopDragging);
carousel.addEventListener("pointercancel", stopDragging);
carousel.addEventListener("pointerleave", stopDragging);
chatBack.addEventListener("click", closeChat);
chatComposer.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();

  if (!text) return;

  const message = { from: "user", text };
  chatHistories[activeChatIndex].push(message);
  appendMessage(message);
  chatInput.value = "";
  chatMessages.scrollTop = chatMessages.scrollHeight;
  renderChatList();
});
window.addEventListener("resize", () => {
  normalizeLoopPosition();
  jumpTo(currentIndex);
});
