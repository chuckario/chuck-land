import Phaser from 'phaser';
import { getPlayableClassOptions, PlayableClassOption } from '@shared/classConfig';
import { socketClient } from '../network/SocketClient';
import { CLASS_COLORS, formatEnumLabel } from '../utils/playableOptions';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { BootScene } from './BootScene';

interface ClassCard {
  option: PlayableClassOption;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
}

export class ClassSelectScene extends Phaser.Scene {
  private playableClasses: PlayableClassOption[] = [];
  private selectedOption?: PlayableClassOption;
  private playerName = 'Spieler';
  private nameText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private classCards: ClassCard[] = [];
  private joinButton!: Phaser.GameObjects.Container;
  private joinButtonBg!: Phaser.GameObjects.Rectangle;
  private isJoining = false;

  constructor() {
    super({ key: 'ClassSelectScene' });
  }

  create(): void {
    this.playableClasses = getPlayableClassOptions(BootScene.getBundle(this));
    this.selectedOption = this.playableClasses[0];

    this.createBackground();
    this.createHeader();
    this.createNameInput();
    this.createClassGrid();
    this.createJoinButton();
    this.connectToServer();
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private createHeader(): void {
    this.add.text(GAME_WIDTH / 2, 40, 'Chuck Land', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '42px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 85, 'Wähle deine Klasse', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      color: '#94a3b8',
    }).setOrigin(0.5);
  }

  private createNameInput(): void {
    this.add.text(80, 130, 'Name:', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      color: '#cbd5e1',
    });

    const nameBox = this.add.rectangle(280, 138, 260, 36, 0x1e293b)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x475569);

    this.nameText = this.add.text(280, 138, this.playerName, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      color: '#f8fafc',
    }).setOrigin(0.5);

    nameBox.setInteractive({ useHandCursor: true });
    nameBox.on('pointerdown', () => {
      this.startNameInput();
    });
    this.nameText.setInteractive({ useHandCursor: true });
    this.nameText.on('pointerdown', () => {
      this.startNameInput();
    });
  }

  private startNameInput(): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.playerName;
    input.maxLength = 20;
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.focus();
    input.select();

    input.addEventListener('blur', () => {
      const value = input.value.trim();
      if (value) {
        this.playerName = value;
        this.nameText.setText(value);
      }
      input.remove();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        input.blur();
      }
    });
  }

  private createClassGrid(): void {
    this.add.text(GAME_WIDTH / 2, 200, 'Klasse', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '20px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    if (this.playableClasses.length === 0) {
      this.add.text(GAME_WIDTH / 2, 280, 'Keine Klassen-Assets gefunden.\nBitte assets:scan ausführen.', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#f87171',
        align: 'center',
      }).setOrigin(0.5);
      return;
    }

    const columns = this.playableClasses.length <= 4 ? 2 : 4;
    const cardWidth = 220;
    const cardHeight = 80;
    const gapX = 28;
    const gapY = 20;
    const gridWidth = columns * cardWidth + (columns - 1) * gapX;
    const startX = (GAME_WIDTH - gridWidth) / 2 + cardWidth / 2;
    const startY = 250;

    this.playableClasses.forEach((option, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      const isSelected = option.profileId === this.selectedOption?.profileId;

      const background = this.add.rectangle(
        0,
        0,
        cardWidth,
        cardHeight,
        CLASS_COLORS[option.heroClass],
        0.9,
      ).setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xf8fafc : 0x334155);

      const label = this.add.text(0, -8, option.label, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#f8fafc',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5);

      const subtitle = this.add.text(0, 18, formatEnumLabel(option.heroClass), {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '12px',
        color: '#e2e8f0',
        align: 'center',
      }).setOrigin(0.5);

      const container = this.add.container(x, y, [background, label, subtitle]);
      container.setSize(cardWidth, cardHeight);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight),
        Phaser.Geom.Rectangle.Contains,
      );

      container.on('pointerover', () => {
        if (option.profileId !== this.selectedOption?.profileId) {
          background.setStrokeStyle(2, 0xe2e8f0);
        }
      });

      container.on('pointerout', () => {
        if (option.profileId !== this.selectedOption?.profileId) {
          background.setStrokeStyle(1, 0x334155);
        }
      });

      container.on('pointerdown', () => {
        this.selectClass(option);
      });

      this.classCards.push({ option, container, background });
    });
  }

  private selectClass(option: PlayableClassOption): void {
    this.selectedOption = option;

    this.classCards.forEach(({ option: cardOption, background }) => {
      const isSelected = cardOption.profileId === option.profileId;
      background.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xf8fafc : 0x334155);
    });
  }

  private createJoinButton(): void {
    this.joinButtonBg = this.add.rectangle(0, 0, 220, 52, 0x2563eb)
      .setStrokeStyle(2, 0x60a5fa);

    const label = this.add.text(0, 0, 'Spiel starten', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.joinButton = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 60, [this.joinButtonBg, label]);
    this.joinButton.setSize(220, 52);
    this.joinButton.setInteractive(
      new Phaser.Geom.Rectangle(-110, -26, 220, 52),
      Phaser.Geom.Rectangle.Contains,
    );

    this.joinButton.on('pointerover', () => {
      if (!this.isJoining) {
        this.joinButtonBg.setFillStyle(0x3b82f6);
      }
    });

    this.joinButton.on('pointerout', () => {
      if (!this.isJoining) {
        this.joinButtonBg.setFillStyle(0x2563eb);
      }
    });

    this.joinButton.on('pointerdown', () => {
      this.handleJoin();
    });

    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 110, 'Verbinde mit Server...', {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '14px',
      color: '#94a3b8',
    }).setOrigin(0.5);
  }

  private async connectToServer(): Promise<void> {
    socketClient.onError((message) => {
      this.statusText.setText(message).setColor('#f87171');
      this.isJoining = false;
      this.joinButtonBg.setFillStyle(0x2563eb);
    });

    socketClient.onSessionExpired(() => {
      this.statusText.setText('Session abgelaufen — bitte neu beitreten.').setColor('#fbbf24');
      this.isJoining = false;
      this.joinButtonBg.setFillStyle(0x2563eb);
    });

    try {
      await socketClient.connect();

      const restoredHero = await socketClient.tryRestoreSession();
      if (restoredHero) {
        this.statusText.setText('Session wiederhergestellt').setColor('#4ade80');
        this.scene.start('GameScene', { hero: restoredHero });
        return;
      }

      this.statusText.setText('Mit Server verbunden').setColor('#4ade80');
    } catch {
      this.statusText.setText('Server nicht erreichbar (localhost:3000)').setColor('#f87171');
    }
  }

  private handleJoin(): void {
    if (this.isJoining || !socketClient.isConnected || !this.selectedOption) {
      return;
    }

    this.isJoining = true;
    this.statusText.setText('Trete Spiel bei...').setColor('#94a3b8');
    this.joinButtonBg.setFillStyle(0x475569);

    const pendingName = this.playerName;
    const pendingClass = this.selectedOption.heroClass;
    const pendingProfileId = this.selectedOption.profileId;

    socketClient.onPlayerJoined((hero) => {
      if (
        !this.isJoining
        || hero.name !== pendingName
        || hero.classType !== pendingClass
        || hero.profileId !== pendingProfileId
      ) {
        return;
      }

      this.isJoining = false;
      this.scene.start('GameScene', { hero });
    });

    socketClient.join(pendingName, pendingClass, pendingProfileId);
  }
}
