let allLists = {};
let currentListName = "";
let currentWords = [];
let currentIndex = 0;
let isSpellingMode = false;

try {
    if (typeof FLASHCARD_DATA === 'undefined') {
        throw new Error("FLASHCARD_DATA variable not found");
    }
    allLists = FLASHCARD_DATA;
    populateDropdown();
    
    const lists = Object.keys(allLists);
    if (lists.length > 0) {
        loadList(lists[0]);
        document.getElementById('listSelector').value = lists[0];
    }
} catch (error) {
    document.getElementById('frontWord').innerText = "Error";
    document.getElementById('frontWord').style.fontSize = "2rem";
    alert("Error loading lists. Please ensure words.js is in the same directory and correctly formatted.");
    console.error(error);
}

if (localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggleBtn').textContent = '☀️';
}

function populateDropdown() {
    const selector = document.getElementById('listSelector');
    selector.innerHTML = "";
    
    const allOption = document.createElement('option');
    allOption.value = "ALL";
    allOption.textContent = "✨ ALL WORDS COMBINED ✨";
    selector.appendChild(allOption);

    Object.keys(allLists).forEach(listName => {
        const option = document.createElement('option');
        option.value = listName;
        option.textContent = listName;
        selector.appendChild(option);
    });
}

function changeList() {
    const selector = document.getElementById('listSelector');
    loadList(selector.value);
}

function loadList(listName) {
    currentListName = listName;
    if (listName === "ALL") {
        currentWords = Object.values(allLists).flat();
    } else {
        currentWords = [...allLists[listName]];
    }
    currentIndex = 0;

    // Force immediate sync without animation delay when explicitly changing lists
    const card = document.getElementById('card');
    card.classList.remove('flipped');
    window.speechSynthesis.cancel();
    renderTextValues();
}

function resetCardPositions() {
    const leftCard = document.getElementById('leftCard');
    const centerCard = document.getElementById('card');
    const rightCard = document.getElementById('rightCard');

    // Strip out stray navigation animation helpers
    leftCard.style.transition = 'none';
    centerCard.style.transition = 'none';
    rightCard.style.transition = 'none';

    leftCard.className = 'flashcard pos-left';
    centerCard.className = 'flashcard pos-center';
    rightCard.className = 'flashcard pos-right';
}

// Handles switching modes dynamically
function toggleSpellingMode() {
    isSpellingMode = !isSpellingMode;
    const btn = document.getElementById('modeToggleBtn');

    if (isSpellingMode) {
        btn.textContent = "Spell";
        btn.classList.add('active-mode');
    } else {
        btn.textContent = "Sight";
        btn.classList.remove('active-mode');
    }
    renderTextValues();
}

function renderTextValues() {
    if (!currentWords || currentWords.length === 0) {
        document.getElementById('frontWord').innerText = "Empty List";
        document.getElementById('backHint').innerText = "";
        document.getElementById('progress').innerText = "Card 0 of 0";
        return;
    }

    const prevIndex = (currentIndex - 1 + currentWords.length) % currentWords.length;
    const nextIndex = (currentIndex + 1) % currentWords.length;
    const tempIndex = (currentIndex + (document.getElementById("tempCard").classList.contains("pos-left") ? -2 : 2) + currentWords.length) % currentWords.length;

    const currentCardData = currentWords[currentIndex];
    const prevCardData = currentWords[prevIndex];
    const nextCardData = currentWords[nextIndex];
    const tempCardData = currentWords[tempIndex];

    const frontDisplay = document.getElementById('frontWord');
    const backDisplay = document.getElementById('backHint');
    const leftWord = document.getElementById('leftWord');
    const rightWord = document.getElementById('rightWord');
    const tempWord = document.getElementById('tempWord');

    frontDisplay.innerText = currentCardData.word;
    leftWord.innerText = prevCardData.word;
    rightWord.innerText = nextCardData.word;
    tempWord.innerText = tempCardData.word;
    if (isSpellingMode) {
        frontDisplay.classList.add('redacted-word');
        leftWord.classList.add('redacted-word');
        rightWord.classList.add('redacted-word');
        tempWord.classList.add('redacted-word');
    } else {
        frontDisplay.classList.remove('redacted-word');
        leftWord.classList.remove('redacted-word');
        rightWord.classList.remove('redacted-word');
        tempWord.classList.remove('redacted-word');
    }

    const targetWord = currentCardData.word;
    const originalSentence = currentCardData.sentence || "No sample sentence provided.";

    // Regex looks for the whole target word safely (case-insensitive)
    const regex = new RegExp(`\\b(${targetWord})\\b`, 'gi');
    if (isSpellingMode && currentCardData.sentence) {
        backDisplay.innerHTML = originalSentence.replace(regex, '<span class="redacted">$1</span>');
    } else {
        backDisplay.innerHTML = originalSentence.replace(regex, '<span class="word-in-sentence">$1</span>');
    }

    document.getElementById('progress').innerText = `Card ${currentIndex + 1} of ${currentWords.length}`;
}

function updateCardDisplay() {
    const card = document.getElementById('card');
    window.speechSynthesis.cancel();

    // Check if the card is currently flipped to the back side
    if (card.classList.contains('flipped')) {
        // Step 1: Flip card back over to the front immediately
        card.classList.remove('flipped');
        
        // Step 2: Wait 250ms for the animation to hide the back face before swapping text
        setTimeout(() => {
            renderTextValues();
        }, 250);
    } else {
        // If already on the front face, update the text instantly
        renderTextValues();
    }
}

function flipCard() {
    document.getElementById('card').classList.toggle('flipped');
    window.speechSynthesis.cancel();
}

function nextCard() {
    moveCarousel('next');
}

function prevCard() {
    moveCarousel('prev');
}

// Unified Core Carousel Navigation Engine
function moveCarousel(direction) {
    if (currentWords.length === 0) return;

    const leftCard = document.getElementById('leftCard');
    const centerCard = document.getElementById('card');
    const rightCard = document.getElementById('rightCard');
    const tempCard = document.getElementById('tempCard');
    window.speechSynthesis.cancel();

    // 1. Unified Flip Detection: If card is flipped, flip it back first, then re-fire
    if (centerCard.classList.contains('flipped')) {
        centerCard.classList.remove('flipped');

        // Advance internal counter immediately so the text swaps cleanly after the flip finishes
        if (direction === 'next') {
            currentIndex = (currentIndex + 1) % currentWords.length;
        } else {
            currentIndex = (currentIndex - 1 + currentWords.length) % currentWords.length;
        }

        setTimeout(() => { moveCarousel(direction); }, 250);
        return;
    }

    // 2. Adjust internal list pointer only if we didn't pre-advance it during a flip action
    if (!centerCard.classList.contains('flipped')) {
        if (direction === 'next') {
            currentIndex = (currentIndex + 1) % currentWords.length;
        } else {
            currentIndex = (currentIndex - 1 + currentWords.length) % currentWords.length;
        }
    }

    // 3. Temporarily kill transitions to stage text layout positioning instantly
    leftCard.style.transition = 'none';
    centerCard.style.transition = 'none';
    rightCard.style.transition = 'none';
    tempCard.style.transition = 'none';

    // 4. Set up the structural offsets based on direction bounds
    if (direction === 'next') {
        leftCard.className = 'flashcard pos-center';
        centerCard.className = 'flashcard pos-right';
        rightCard.className = 'flashcard pos-farright';
        tempCard.className = 'flashcard pos-left';
    } else {
        leftCard.className = 'flashcard pos-farleft';
        centerCard.className = 'flashcard pos-left';
        rightCard.className = 'flashcard pos-center';
        tempCard.className = 'flashcard pos-right';
    }

    // 5. Populate text states while layout nodes are hidden/offset
    renderTextValues();

    // 6. Force immediate browser layout engine reflow
    void centerCard.offsetWidth;

    // 7. Restore active CSS transition properties
    leftCard.style.transition = '';
    centerCard.style.transition = '';
    rightCard.style.transition = '';
    tempCard.style.transition = '';

    // 8. Slide cards smoothly back to their final structural default centers
    leftCard.className = 'flashcard pos-left';
    centerCard.className = 'flashcard pos-center';
    rightCard.className = 'flashcard pos-right';
    if (direction === 'next') {
        tempCard.className = 'flashcard pos-farleft';
    } else {
        tempCard.className = 'flashcard pos-farright';
    }
}

function shuffleCurrentList() {
    if (currentWords.length <= 1) return;

    for (let i = currentWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentWords[i], currentWords[j]] = [currentWords[j], currentWords[i]];
    }
    currentIndex = 0;

    const card = document.getElementById('card');
    if (card.classList.contains('flipped')) {
        card.classList.remove('flipped');
        setTimeout(() => { resetCardPositions(); renderTextValues(); }, 250);
    } else {
        resetCardPositions();
        renderTextValues();
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const toggleBtn = document.getElementById('themeToggleBtn');
    
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        toggleBtn.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        toggleBtn.textContent = '☀️';
    }
}

document.addEventListener('keydown', function(event) {
    if (document.activeElement === document.getElementById('listSelector')) {
        return;
    }
    
    if (event.code === 'Space') {
        event.preventDefault();
        flipCard();
    } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        nextCard();
    } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        prevCard();
    }
});

function speakWord(event) {
    event.stopPropagation(); 
    if (currentWords.length === 0) return;
    
    window.speechSynthesis.cancel(); 
    const currentCardData = currentWords[currentIndex];
    const utterance = new SpeechSynthesisUtterance(currentCardData.word);
    utterance.rate = 0.6;
    window.speechSynthesis.speak(utterance);
}

function speakSentence(event) {
    event.stopPropagation(); 
    if (currentWords.length === 0) return;
    
    window.speechSynthesis.cancel(); 
    const currentCardData = currentWords[currentIndex];
    const targetSentence = currentCardData.sentence || "No sentence provided.";
    const utterance = new SpeechSynthesisUtterance(targetSentence);
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance);
}
