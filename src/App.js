<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Indovinello del Messaggero</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 900px;
            width: 100%;
        }

        h1 {
            text-align: center;
            color: #667eea;
            margin-bottom: 20px;
            font-size: 2.5em;
        }

        .description {
            text-align: center;
            color: #555;
            font-size: 1.1em;
            line-height: 1.7;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }

        .grid-wrapper {
            display: flex;
            justify-content: center;
            margin-bottom: 40px;
        }

        .crossword-grid {
            display: inline-grid;
            gap: 2px;
            background: #ddd;
            padding: 2px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .grid-cell {
            width: 40px;
            height: 40px;
            background: white;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 3px;
        }

        .grid-cell.black {
            background: #2c3e50;
        }

        .grid-cell input {
            width: 100%;
            height: 100%;
            border: none;
            text-align: center;
            font-size: 1.3em;
            font-weight: bold;
            text-transform: uppercase;
            font-family: 'Courier New', monospace;
            background: transparent;
            border-radius: 3px;
        }

        .grid-cell input:focus {
            outline: none;
            background: #e3f2fd;
            box-shadow: inset 0 0 0 2px #667eea;
        }

        .grid-cell.special input {
            background: #fff3cd;
        }

        .grid-cell.special input:focus {
            background: #ffeaa7;
        }

        .grid-cell .number {
            position: absolute;
            top: 2px;
            left: 3px;
            font-size: 9px;
            font-weight: bold;
            color: #667eea;
            pointer-events: none;
            z-index: 1;
        }

        .questions-container {
            margin-top: 30px;
        }

        .question-item {
            margin-bottom: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            transition: all 0.3s;
            opacity: 0;
            animation: slideIn 0.5s forwards;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .question-item:nth-child(1) { animation-delay: 0.1s; }
        .question-item:nth-child(2) { animation-delay: 0.2s; }
        .question-item:nth-child(3) { animation-delay: 0.3s; }
        .question-item:nth-child(4) { animation-delay: 0.4s; }
        .question-item:nth-child(5) { animation-delay: 0.5s; }
        .question-item:nth-child(6) { animation-delay: 0.6s; }
        .question-item:nth-child(7) { animation-delay: 0.7s; }

        .question-item:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }

        .question-number {
            display: inline-block;
            background: #667eea;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            text-align: center;
            line-height: 28px;
            font-weight: bold;
            margin-right: 10px;
        }

        .question-text {
            color: #333;
            font-size: 1.05em;
        }

        .hint-box {
            margin-top: 25px;
            padding: 15px 20px;
            background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
            border-radius: 10px;
            text-align: center;
            color: #2d3436;
            font-weight: 500;
            box-shadow: 0 3px 10px rgba(253, 203, 110, 0.3);
        }

        .keyword-section {
            margin-top: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
            border-radius: 15px;
            text-align: center;
            display: none;
        }

        .keyword-section.show {
            display: block;
            animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .keyword-title {
            font-size: 1.5em;
            color: #667eea;
            margin-bottom: 20px;
            font-weight: bold;
        }

        .keyword-input {
            width: 100%;
            max-width: 400px;
            padding: 15px;
            font-size: 1.5em;
            text-align: center;
            border: 3px solid #667eea;
            border-radius: 10px;
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 10px;
            font-family: 'Courier New', monospace;
        }

        .keyword-input:focus {
            outline: none;
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
        }

        .check-button {
            margin-top: 20px;
            padding: 15px 40px;
            font-size: 1.2em;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }

        .check-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .check-button:active {
            transform: translateY(0);
        }

        .success-message {
            display: none;
            margin-top: 40px;
            padding: 40px;
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            border-radius: 15px;
            text-align: center;
            color: white;
        }

        .success-message.show {
            display: block;
            animation: zoomIn 0.6s ease-out;
        }

        @keyframes zoomIn {
            from {
                opacity: 0;
                transform: scale(0.8);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .restaurant-logo {
            max-width: 450px;
            width: 100%;
            margin: 20px auto;
            display: block;
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            cursor: pointer;
            transition: all 0.3s;
        }

        .restaurant-link {
            display: block;
            text-decoration: none;
            color: inherit;
            transition: transform 0.3s;
        }

        .restaurant-link:hover {
            transform: scale(1.05);
        }

        .restaurant-link:hover .restaurant-logo {
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }

        .success-icon {
            font-size: 4em;
            margin-bottom: 20px;
            animation: bounce 1s infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }

        .click-hint {
            margin-top: 15px;
            font-size: 1.2em;
            font-weight: bold;
            color: white;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .success-text {
            font-size: 1.4em;
            line-height: 1.6;
            margin-top: 25px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            
            h1 {
                font-size: 1.8em;
            }
            
            .grid-cell {
                width: 35px;
                height: 35px;
            }
            
            .grid-cell input {
                font-size: 1.1em;
            }

            .description {
                font-size: 1em;
            }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💌 Indovinello del Messaggero 💌</h1>
        
        <div class="description">
            Per scoprire dove delizierai il tuo palato il giorno di San Valentino dovrai risolvere il seguente indovinello, trovando la parola chiave. Confido nella tua bravura dati i tuoi allenamenti con la Settimana Enigmistica, buona fortuna!
        </div>

        <div class="grid-wrapper">
            <div class="crossword-grid" id="crossword-grid"></div>
        </div>

        <div class="questions-container">
            <div class="question-item">
                <span class="question-number">1</span>
                <span class="question-text">Miagola quando la chiami</span>
            </div>
            <div class="question-item">
                <span class="question-number">2</span>
                <span class="question-text">Ristorante preferito nostro a Szczecin</span>
            </div>
            <div class="question-item">
                <span class="question-number">3</span>
                <span class="question-text">Lo è pety sotto le coperte</span>
            </div>
            <div class="question-item">
                <span class="question-number">4</span>
                <span class="question-text">Quando ci siamo dati il primo bacio?</span>
            </div>
            <div class="question-item">
                <span class="question-number">5</span>
                <span class="question-text">Prima canzone cantata insieme</span>
            </div>
            <div class="question-item">
                <span class="question-number">6</span>
                <span class="question-text">Canzone iconica di Czaplinek</span>
            </div>
            <div class="question-item">
                <span class="question-number">7</span>
                <span class="question-text">È un po' goffo quando corre e ama il cibo</span>
            </div>
        </div>

        <div class="hint-box">
            💡 <strong>Suggerimento:</strong> Le caselle gialle formano la parola chiave leggendo dall'alto verso il basso!
        </div>

        <div class="keyword-section" id="keyword-section">
            <div class="keyword-title">🔑 Inserisci la parola chiave</div>
            <input 
                type="text" 
                id="keyword-input" 
                class="keyword-input" 
                maxlength="7"
                placeholder="_ _ _ _ _ _ _"
            >
            <br>
            <button class="check-button" onclick="checkKeyword()">Verifica Parola Chiave</button>
        </div>

        <div class="success-message" id="success-message">
            <div class="success-icon">🎉</div>
            <div class="success-text">
                Complimenti, sapevo ce l'avresti fatta, ora non ti resta che goderti un prelibato pasto meritato ❤️
            </div>
            <a href="https://ristorantevirginiae.it/" target="_blank" class="restaurant-link">
                <img src="/mnt/user-data/uploads/1770565329732_image.png" alt="Ristorante Virginiae" class="restaurant-logo">
                <div class="click-hint">Clicca per scoprire il ristorante! 🍽️</div>
            </a>
        </div>
    </div>

    <script>
        const crosswordData = [
            { answer: "SPARTA", row: 0, col: 0, number: 1, specialCol: 1 },
            { answer: "ZIEMNIAK I SPOLKA", row: 2, col: 0, number: 2, specialCol: 2 },
            { answer: "TERMOSIFONE", row: 4, col: 0, number: 3, specialCol: 0 },
            { answer: "MARZO", row: 6, col: 0, number: 4, specialCol: 1 },
            { answer: "A UN PASSO DA TE", row: 8, col: 0, number: 5, specialCol: 1 },
            { answer: "GRANDINE", row: 10, col: 0, number: 6, specialCol: 1 },
            { answer: "LEONE", row: 12, col: 0, number: 7, specialCol: 2 }
        ];

        const GRID_ROWS = 14;
        const GRID_COLS = 18;

        let gridCells = [];
        let inputs = [];

        function createGrid() {
            const grid = document.getElementById('crossword-grid');
            grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, 40px)`;
            
            for (let r = 0; r < GRID_ROWS; r++) {
                gridCells[r] = [];
                for (let c = 0; c < GRID_COLS; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-cell black';
                    grid.appendChild(cell);
                    gridCells[r][c] = cell;
                }
            }

            crosswordData.forEach((word, wordIndex) => {
                const answer = word.answer.replace(/\s/g, '');
                let charPos = 0;
                
                for (let i = 0; i < word.answer.length; i++) {
                    const c = word.col + i;
                    
                    if (word.answer[i] === ' ') {
                        continue;
                    }
                    
                    const cell = gridCells[word.row][c];
                    cell.classList.remove('black');
                    
                    if (i === 0) {
                        const numberSpan = document.createElement('span');
                        numberSpan.className = 'number';
                        numberSpan.textContent = word.number;
                        cell.appendChild(numberSpan);
                    }
                    
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.dataset.correct = answer[charPos].toUpperCase();
                    input.dataset.row = word.row;
                    input.dataset.col = c;
                    input.dataset.wordIndex = wordIndex;
                    input.dataset.charPos = charPos;
                    
                    if (charPos === word.specialCol) {
                        cell.classList.add('special');
                        input.dataset.special = 'true';
                    }
                    
                    input.addEventListener('input', handleInput);
                    input.addEventListener('keydown', handleKeydown);
                    
                    cell.appendChild(input);
                    inputs.push(input);
                    
                    charPos++;
                }
            });
        }

        function handleInput(e) {
            const input = e.target;
            input.value = input.value.toUpperCase();
            
            if (input.value) {
                const currentIndex = inputs.indexOf(input);
                const currentWord = parseInt(input.dataset.wordIndex);
                
                let nextInput = null;
                for (let i = currentIndex + 1; i < inputs.length; i++) {
                    if (parseInt(inputs[i].dataset.wordIndex) === currentWord) {
                        nextInput = inputs[i];
                        break;
                    }
                }
                
                if (nextInput) {
                    nextInput.focus();
                }
            }
            
            checkCompletion();
        }

        function handleKeydown(e) {
            const input = e.target;
            
            if (e.key === 'Backspace' && !input.value) {
                const currentIndex = inputs.indexOf(input);
                const currentWord = parseInt(input.dataset.wordIndex);
                
                let prevInput = null;
                for (let i = currentIndex - 1; i >= 0; i--) {
                    if (parseInt(inputs[i].dataset.wordIndex) === currentWord) {
                        prevInput = inputs[i];
                        break;
                    }
                }
                
                if (prevInput) {
                    prevInput.focus();
                    prevInput.value = '';
                }
            }
        }

        function checkCompletion() {
            const allFilled = inputs.every(input => input.value.trim() !== '');
            
            // Mostra la sezione parola chiave quando tutte le caselle sono riempite
            if (allFilled) {
                setTimeout(() => {
                    document.getElementById('keyword-section').classList.add('show');
                    document.getElementById('keyword-input').focus();
                    document.getElementById('keyword-section').scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 500);
            }
        }

        function checkKeyword() {
            const keywordInput = document.getElementById('keyword-input');
            const keyword = keywordInput.value.toUpperCase().trim();
            
            if (keyword === 'PETAURO') {
                document.getElementById('success-message').classList.add('show');
                keywordInput.style.background = '#d4edda';
                keywordInput.style.borderColor = '#28a745';
                
                setTimeout(() => {
                    document.getElementById('success-message').scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 300);
                
                for (let i = 0; i < 50; i++) {
                    setTimeout(() => createConfetti(), i * 30);
                }
            } else {
                keywordInput.style.background = '#f8d7da';
                keywordInput.style.borderColor = '#dc3545';
                keywordInput.style.animation = 'shake 0.5s';
                
                setTimeout(() => {
                    keywordInput.style.animation = '';
                    keywordInput.style.background = 'white';
                    keywordInput.style.borderColor = '#667eea';
                }, 500);
            }
        }

        function createConfetti() {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#ee5a6f'][Math.floor(Math.random() * 5)];
            confetti.style.left = Math.random() * window.innerWidth + 'px';
            confetti.style.top = '-10px';
            confetti.style.opacity = '1';
            confetti.style.borderRadius = '50%';
            confetti.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
            confetti.style.transition = 'all 3s ease-out';
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '10000';
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.style.top = window.innerHeight + 'px';
                confetti.style.opacity = '0';
                confetti.style.left = (parseFloat(confetti.style.left) + (Math.random() - 0.5) * 200) + 'px';
            }, 50);
            
            setTimeout(() => confetti.remove(), 3000);
        }

        document.addEventListener('DOMContentLoaded', function() {
            createGrid();
            
            document.getElementById('keyword-input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    checkKeyword();
                }
            });
        });
    </script>
</body>
</html>