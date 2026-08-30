let allLists = {};
let currentListName = "";
let currentWords = [];
let currentIndex = 0;
let isSpellingMode = false; // System state tracking flag

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

    const currentCardData = currentWords[currentIndex];
    const frontDisplay = document.getElementById('frontWord');
    const backDisplay = document.getElementById('backHint');

    // 1. Process Front Side Card text values
    frontDisplay.innerText = currentCardData.word;
    if (isSpellingMode) {
        frontDisplay.classList.add('redacted-word');
    } else {
        frontDisplay.classList.remove('redacted-word');
    }

    // 2. Process Back Side Card Text values (Sentence parsing logic)
    const targetWord = currentCardData.word;
    const originalSentence = currentCardData.sentence || "No sample sentence provided.";

    // Regex looks for the whole target word safely (case-insensitive)
    const regex = new RegExp(`\\b(${targetWord})\\b`, 'gi');
    if (isSpellingMode && currentCardData.sentence) {
        // Inject an inline HTML element containing your requested redaction styles
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
    if (currentWords.length === 0) return;
    currentIndex = (currentIndex + 1) % currentWords.length;
    updateCardDisplay();
}

function prevCard() {
    if (currentWords.length === 0) return;
    currentIndex = (currentIndex - 1 + currentWords.length) % currentWords.length;
    updateCardDisplay();
}

function shuffleCurrentList() {
    if (currentWords.length <= 1) return;
    
    for (let i = currentWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentWords[i], currentWords[j]] = [currentWords[j], currentWords[i]];
    }
    currentIndex = 0;
    
    // Animate smoothly back to front on shuffle execution
    updateCardDisplay();
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
        nextCard();
    } else if (event.code === 'ArrowLeft') {
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
