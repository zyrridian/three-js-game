export interface DialogueLine {
    speaker: string;
    text: string;
    speakerColor?: string;
    choices?: { text: string; callback: () => void }[];
}

export class UIManager {
    private clockUI: HTMLDivElement;
    private startScreen: HTMLDivElement;
    private flashlightUI: HTMLDivElement;
    private screenFlash: HTMLDivElement;
    private isNightMode: boolean = false;

    private keyUI: HTMLDivElement;

    constructor() {
        this.screenFlash = document.createElement('div');
        this.screenFlash.style.position = 'absolute';
        this.screenFlash.style.top = '0';
        this.screenFlash.style.left = '0';
        this.screenFlash.style.width = '100vw';
        this.screenFlash.style.height = '100vh';
        this.screenFlash.style.backgroundColor = 'black';
        this.screenFlash.style.opacity = '0';
        this.screenFlash.style.pointerEvents = 'none';
        this.screenFlash.style.transition = 'opacity 0.28s ease-out';
        this.screenFlash.style.zIndex = '9999';
        document.body.appendChild(this.screenFlash);

        const extraStyles = document.createElement('style');
        extraStyles.innerHTML = `
        @keyframes clockFlash {
            0% { transform: translateX(0); color: white; border-color: white; }
            25% { transform: translateX(-5px); color: red; border-color: red; }
            50% { transform: translateX(5px); color: red; border-color: red; }
            75% { transform: translateX(-5px); color: red; border-color: red; }
            100% { transform: translateX(0); color: white; border-color: white; }
        }
        .clock-flash {
            animation: clockFlash 0.3s ease-in-out;
        }
        `;
        document.head.appendChild(extraStyles);

        this.clockUI = document.createElement('div');
        this.clockUI.id = 'clock-ui';
        this.clockUI.style.position = 'absolute';
        this.clockUI.style.top = '20px';
        this.clockUI.style.left = '20px';
        this.clockUI.style.width = '120px';
        this.clockUI.style.height = '120px';
        this.clockUI.style.borderRadius = '50%';
        this.clockUI.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.clockUI.style.border = '2px solid white';
        this.clockUI.style.display = 'flex';
        this.clockUI.style.flexDirection = 'column';
        this.clockUI.style.alignItems = 'center';
        this.clockUI.style.justifyContent = 'center';
        this.clockUI.style.fontSize = '30px';
        this.clockUI.style.fontFamily = 'monospace';
        this.clockUI.style.color = 'white';
        this.clockUI.style.fontWeight = 'bold';
        this.clockUI.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
        this.clockUI.style.pointerEvents = 'none';
        this.clockUI.style.zIndex = '100';
        document.body.appendChild(this.clockUI);

        this.keyUI = document.createElement('div');
        this.keyUI.id = 'key-ui';
        this.keyUI.style.position = 'absolute';
        this.keyUI.style.top = '150px';
        this.keyUI.style.left = '20px';
        this.keyUI.style.width = '60px';
        this.keyUI.style.height = '60px';
        this.keyUI.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.keyUI.style.border = '2px solid gold';
        this.keyUI.style.borderRadius = '10px';
        this.keyUI.style.display = 'flex';
        this.keyUI.style.alignItems = 'center';
        this.keyUI.style.justifyContent = 'center';
        this.keyUI.style.fontSize = '36px';
        this.keyUI.innerHTML = '🔑';
        this.keyUI.style.opacity = '0';
        this.keyUI.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        this.keyUI.style.transform = 'scale(0.5)';
        this.keyUI.style.pointerEvents = 'none';
        document.body.appendChild(this.keyUI);

        this.startScreen = document.createElement('div');
        this.startScreen.id = 'start-screen';
        this.startScreen.style.position = 'absolute';
        this.startScreen.style.top = '0';
        this.startScreen.style.left = '0';
        this.startScreen.style.width = '100vw';
        this.startScreen.style.height = '100vh';
        this.startScreen.style.backgroundColor = 'rgba(0,0,0,0.8)';
        this.startScreen.style.color = 'white';
        this.startScreen.style.display = 'flex';
        this.startScreen.style.alignItems = 'center';
        this.startScreen.style.justifyContent = 'center';
        this.startScreen.style.fontSize = '30px';
        this.startScreen.style.fontFamily = 'monospace';
        this.startScreen.style.cursor = 'pointer';
        this.startScreen.style.zIndex = '9999';
        this.startScreen.innerHTML = 'Click anywhere to Start';
        document.body.appendChild(this.startScreen);

        this.flashlightUI = document.createElement('div');
        this.flashlightUI.id = 'flashlight-ui';
        this.flashlightUI.style.position = 'absolute';
        this.flashlightUI.style.bottom = '20px';
        this.flashlightUI.style.right = '20px';
        this.flashlightUI.style.fontSize = '32px';
        this.flashlightUI.style.opacity = '0';
        this.flashlightUI.style.transition = 'opacity 0.3s, filter 0.3s';
        this.flashlightUI.innerHTML = '🔦<div style="position:absolute; bottom:-4px; right:-8px; background:#111; color:#fff; font-size:12px; font-family:monospace; padding:2px 5px; border-radius:4px; font-weight:bold; border:1px solid #555; line-height:1; letter-spacing:0;">F</div>';
        this.flashlightUI.style.filter = 'grayscale(100%) opacity(0.5)';
        document.body.appendChild(this.flashlightUI);

        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    public showKey() {
        this.keyUI.style.opacity = '1';
        this.keyUI.style.transform = 'scale(1)';
    }

    public hideKey() {
        this.keyUI.style.opacity = '0';
        this.keyUI.style.transform = 'scale(0.5)';
    }

    public showFinishedScreen() {
        const finished = document.createElement('div');
        finished.style.position = 'absolute';
        finished.style.top = '0';
        finished.style.left = '0';
        finished.style.width = '100vw';
        finished.style.height = '100vh';
        finished.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        finished.style.color = 'gold';
        finished.style.display = 'flex';
        finished.style.flexDirection = 'column';
        finished.style.alignItems = 'center';
        finished.style.justifyContent = 'center';
        finished.style.fontSize = '80px';
        finished.style.fontFamily = 'monospace';
        finished.style.fontWeight = 'bold';
        finished.style.textShadow = '0 0 20px gold';
        finished.style.zIndex = '100000';
        finished.style.opacity = '0';
        finished.style.transition = 'opacity 2s ease';
        finished.style.pointerEvents = 'auto'; // allow clicking inside it
        
        const title = document.createElement('div');
        title.innerHTML = 'LEVEL COMPLETED';
        finished.appendChild(title);
        
        const retryBtn = document.createElement('button');
        retryBtn.innerHTML = 'RETRY';
        retryBtn.style.marginTop = '40px';
        retryBtn.style.padding = '15px 40px';
        retryBtn.style.fontSize = '30px';
        retryBtn.style.fontFamily = 'monospace';
        retryBtn.style.fontWeight = 'bold';
        retryBtn.style.color = 'black';
        retryBtn.style.backgroundColor = 'gold';
        retryBtn.style.border = 'none';
        retryBtn.style.borderRadius = '10px';
        retryBtn.style.cursor = 'pointer';
        retryBtn.style.boxShadow = '0 0 15px gold';
        retryBtn.addEventListener('mouseover', () => retryBtn.style.transform = 'scale(1.1)');
        retryBtn.addEventListener('mouseout', () => retryBtn.style.transform = 'scale(1)');
        retryBtn.style.transition = 'transform 0.2s';
        
        retryBtn.addEventListener('click', () => {
            window.location.reload();
        });
        finished.appendChild(retryBtn);
        
        document.body.appendChild(finished);
        
        requestAnimationFrame(() => finished.style.opacity = '1');
    }

    private updateClock() {
        const d = new Date();
        let hours = d.getHours();
        if (this.isNightMode) {
            hours = (hours + 12) % 24;
        }
        const hh = hours.toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        this.clockUI.innerHTML = `${hh}:${mm}`;
    }

    public setNightMode(isNight: boolean) {
        this.isNightMode = isNight;
        this.updateClock();
    }

    public triggerClockFlash() {
        this.clockUI.classList.remove('clock-flash');
        void this.clockUI.offsetWidth; // trigger reflow
        this.clockUI.classList.add('clock-flash');
    }

    public onStart(callback: () => void) {
        this.startScreen.addEventListener('click', () => {
            this.startScreen.remove();
            callback();
        });
    }

    public updateFlashlightUI(isNight: boolean, isFlashlightOn: boolean) {
        if (isNight) {
            this.flashlightUI.style.opacity = '1';
            this.flashlightUI.style.filter = isFlashlightOn ? 'drop-shadow(0 0 10px yellow)' : 'grayscale(100%) opacity(0.5)';
        } else {
            this.flashlightUI.style.opacity = '0';
        }
    }

    public showFlashlightHint() {
        const hint = document.createElement('div');
        hint.id = 'flashlight-hint';
        hint.innerHTML = 'Press <b>F</b> to toggle flashlight<br><span style="font-size:16px; opacity:0.8;">Press <b>Tab</b> to return to day</span>';
        hint.style.position = 'absolute';
        hint.style.top = '20%';
        hint.style.left = '50%';
        hint.style.transform = 'translate(-50%, -50%)';
        hint.style.color = 'white';
        hint.style.fontFamily = 'monospace';
        hint.style.fontSize = '24px';
        hint.style.textAlign = 'center';
        hint.style.textShadow = '0 2px 4px black';
        hint.style.opacity = '0';
        hint.style.transition = 'opacity 1s';
        hint.style.pointerEvents = 'none';
        document.body.appendChild(hint);

        requestAnimationFrame(() => hint.style.opacity = '1');
        setTimeout(() => {
            if (document.getElementById('flashlight-hint')) {
                hint.style.opacity = '0';
                setTimeout(() => hint.remove(), 1000);
            }
        }, 5000);
    }

    public setScreenFlash(opacity: string) {
        this.screenFlash.style.opacity = opacity;
    }

    private cutsceneLines: DialogueLine[] = [];
    private currentCutsceneIndex: number = 0;
    private onCutsceneEnd: (() => void) | null = null;
    private onType: ((speaker: string) => void) | null = null;
    private typeTimer: any = null;
    public isCutsceneActive: boolean = false;
    private cutsceneKeyHandler: ((e: KeyboardEvent) => void) | null = null;
    private cutsceneClickHandler: ((e: MouseEvent) => void) | null = null;

    public startCutsceneDialogue(lines: DialogueLine[], onEnd: () => void, onType?: (speaker: string) => void) {
        this.cutsceneLines = lines;
        this.currentCutsceneIndex = 0;
        this.onCutsceneEnd = onEnd;
        this.onType = onType || null;
        this.isCutsceneActive = true;
        
        if (!this.cutsceneKeyHandler) {
            this.cutsceneKeyHandler = (e: KeyboardEvent) => {
                if (this.isCutsceneActive && e.key === 'Enter') {
                    this.advanceCutscene();
                }
            };
            this.cutsceneClickHandler = (e: MouseEvent) => {
                // Ensure it's left click (button 0)
                if (this.isCutsceneActive && e.button === 0) {
                    this.advanceCutscene();
                }
            };
            window.addEventListener('keydown', this.cutsceneKeyHandler);
            window.addEventListener('pointerdown', this.cutsceneClickHandler);
        }

        this.renderCurrentCutsceneLine();
    }

    private advanceCutscene() {
        if (!this.isCutsceneActive) return;
        
        const line = this.cutsceneLines[this.currentCutsceneIndex];

        // If line has choices and typing is done, block advance until a choice is clicked
        if (line.choices && !this.typeTimer) {
            return;
        }

        // If still typing, skip to end of line
        if (this.typeTimer) {
            clearInterval(this.typeTimer);
            this.typeTimer = null;
            this.finishCurrentLine();
            return;
        }

        this.currentCutsceneIndex++;
        if (this.currentCutsceneIndex >= this.cutsceneLines.length) {
            this.isCutsceneActive = false;
            this.hideCutsceneText();
            if (this.onCutsceneEnd) this.onCutsceneEnd();
        } else {
            this.renderCurrentCutsceneLine();
        }
    }

    private getBaseHTML(line: DialogueLine) {
        const color = line.speakerColor || 'red';
        return `
            <div style="position: absolute; top: -18px; left: 15px; background: rgba(0,0,0,0.9); padding: 4px 12px; border: 2px solid white; border-radius: 5px; color: ${color}; font-size: 18px; font-weight: bold;">
                ${line.speaker}
            </div>
            <span id="cutscene-inner-text"></span>
            <br>
            <span style="font-size:12px; opacity:0; display:block; margin-top:15px; text-align:right;" id="cutscene-prompt">[Left Click or Enter to continue]</span>
        `;
    }

    private renderCurrentCutsceneLine() {
        this.ensureCutsceneDiv();
        const div = document.getElementById('cutscene-text');
        if (!div) return;
        
        const line = this.cutsceneLines[this.currentCutsceneIndex];
        const fullText = line.text;
        let charIndex = 0;
        
        div.innerHTML = this.getBaseHTML(line);
        const innerSpan = document.getElementById('cutscene-inner-text');
        const promptSpan = document.getElementById('cutscene-prompt');

        if (this.typeTimer) clearInterval(this.typeTimer);

        this.typeTimer = setInterval(() => {
            if (!innerSpan) return;
            const char = fullText.charAt(charIndex);
            innerSpan.innerHTML += char;
            
            if (char !== ' ' && this.onType) {
                this.onType(line.speaker);
            }

            charIndex++;
            if (charIndex >= fullText.length) {
                clearInterval(this.typeTimer);
                this.typeTimer = null;
                if (line.choices) {
                    if (promptSpan) promptSpan.style.display = 'none';
                    this.renderChoices(line.choices, div);
                } else {
                    if (promptSpan) promptSpan.style.opacity = '0.6';
                }
            }
        }, 40); // Typewriter speed
    }

    private finishCurrentLine() {
        const div = document.getElementById('cutscene-text');
        if (!div) return;
        const line = this.cutsceneLines[this.currentCutsceneIndex];
        div.innerHTML = `
            <div style="position: absolute; top: -18px; left: 15px; background: rgba(0,0,0,0.9); padding: 4px 12px; border: 2px solid white; border-radius: 5px; color: ${line.speakerColor || 'red'}; font-size: 18px; font-weight: bold;">
                ${line.speaker}
            </div>
            <span id="cutscene-inner-text">${line.text}</span>
            <br>
            <span style="font-size:12px; opacity:0.6; display:${line.choices ? 'none' : 'block'}; margin-top:15px; text-align:right;" id="cutscene-prompt">[Left Click or Enter to continue]</span>
        `;
        if (line.choices) {
            this.renderChoices(line.choices, div);
        }
    }

    private renderChoices(choices: { text: string; callback: () => void }[], container: HTMLElement) {
        const choiceContainer = document.createElement('div');
        choiceContainer.style.display = 'flex';
        choiceContainer.style.gap = '20px';
        choiceContainer.style.marginTop = '20px';
        choiceContainer.style.justifyContent = 'center';
        
        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.innerHTML = choice.text;
            btn.style.padding = '10px 30px';
            btn.style.fontSize = '20px';
            btn.style.fontFamily = 'monospace';
            btn.style.fontWeight = 'bold';
            btn.style.backgroundColor = 'white';
            btn.style.color = 'black';
            btn.style.border = '2px solid black';
            btn.style.borderRadius = '5px';
            btn.style.cursor = 'pointer';
            
            btn.addEventListener('mouseover', () => {
                btn.style.backgroundColor = 'gold';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.backgroundColor = 'white';
            });
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent advanceCutscene from firing
                choice.callback();
            });
            
            choiceContainer.appendChild(btn);
        });
        
        container.appendChild(choiceContainer);
    }

    private ensureCutsceneDiv() {
        let div = document.getElementById('cutscene-text');
        if (!div) {
            div = document.createElement('div');
            div.id = 'cutscene-text';
            div.style.position = 'absolute';
            div.style.bottom = '10%';
            div.style.left = '50%';
            div.style.transform = 'translateX(-50%)';
            div.style.width = '70%'; // Static width relative to screen
            div.style.maxWidth = '800px';
            div.style.minHeight = '100px';
            div.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            div.style.color = 'white';
            div.style.padding = '30px 30px 20px 30px';
            div.style.fontFamily = 'monospace';
            div.style.fontSize = '22px';
            div.style.border = '2px solid white';
            div.style.borderRadius = '8px';
            div.style.zIndex = '10000';
            div.style.textAlign = 'left';
            div.style.textShadow = '1px 1px 2px black';
            document.body.appendChild(div);
        }
    }

    public hideCutsceneText() {
        if (this.typeTimer) {
            clearInterval(this.typeTimer);
            this.typeTimer = null;
        }
        const div = document.getElementById('cutscene-text');
        if (div) div.remove();
    }

    private interactionPrompt: HTMLDivElement | null = null;
    public showInteractionPrompt(text: string) {
        if (!this.interactionPrompt) {
            this.interactionPrompt = document.createElement('div');
            this.interactionPrompt.style.position = 'absolute';
            this.interactionPrompt.style.bottom = '20%';
            this.interactionPrompt.style.left = '50%';
            this.interactionPrompt.style.transform = 'translateX(-50%)';
            this.interactionPrompt.style.color = 'white';
            this.interactionPrompt.style.fontFamily = 'monospace';
            this.interactionPrompt.style.fontSize = '24px';
            this.interactionPrompt.style.textShadow = '0 2px 4px black';
            this.interactionPrompt.style.zIndex = '1000';
            this.interactionPrompt.style.pointerEvents = 'none';
            document.body.appendChild(this.interactionPrompt);
        }
        this.interactionPrompt.innerHTML = text;
        this.interactionPrompt.style.display = 'block';
    }

    public hideInteractionPrompt() {
        if (this.interactionPrompt) {
            this.interactionPrompt.style.display = 'none';
        }
    }

    private notificationUI: HTMLDivElement | null = null;
    private notificationTimer: any = null;
    public showNotification(text: string) {
        if (!this.notificationUI) {
            this.notificationUI = document.createElement('div');
            this.notificationUI.style.position = 'absolute';
            this.notificationUI.style.top = '10%';
            this.notificationUI.style.left = '50%';
            this.notificationUI.style.transform = 'translateX(-50%)';
            this.notificationUI.style.color = '#ffff44';
            this.notificationUI.style.fontFamily = 'monospace';
            this.notificationUI.style.fontSize = '26px';
            this.notificationUI.style.fontWeight = 'bold';
            this.notificationUI.style.textShadow = '1px 1px 3px black';
            this.notificationUI.style.zIndex = '1000';
            this.notificationUI.style.pointerEvents = 'none';
            this.notificationUI.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(this.notificationUI);
        }
        this.notificationUI.innerHTML = text;
        this.notificationUI.style.opacity = '1';
        
        if (this.notificationTimer) clearTimeout(this.notificationTimer);
        this.notificationTimer = setTimeout(() => {
            if (this.notificationUI) this.notificationUI.style.opacity = '0';
        }, 3000);
    }
}
