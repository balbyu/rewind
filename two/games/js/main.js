// AppleJS - a spinoff of a Mozilla Workshop platformer game. I have no idea what
// doing.


// =============================================================================
// Sprites
// =============================================================================

//
//Apple Sprite
//
function hero(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'hero');  // call Phaser.Sprite constructor
    this.anchor.set(0.5, 0.5); //Adjust center of character
    this.game.physics.enable(this); // Use Phaser physics engine
    this.body.collideWorldBounds = true; //Enable bounds on character

    this.animations.add('stop', [0]);
    this.animations.add('run', [1, 2], 8, true); // 8fps looped
    this.animations.add('jump', [3]);
    this.animations.add('fall', [3]);
}

// Inherit from Phaser.Sprite
hero.prototype = Object.create(Phaser.Sprite.prototype);
hero.prototype.constructor = hero;

hero.prototype.move = function (direction) {
    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;

    //Load correct img based on traveling right/left
    if (this.body.velocity.x < 0) {
        this.scale.x = -1;
    }
    else if (this.body.velocity.x > 0) {
        this.scale.x = 1;
    }
};

hero.prototype.jump = function () {
    const JUMP_SPEED = 600;
    let canJump = this.body.touching.down;

    if(canJump){
        this.body.velocity.y = -JUMP_SPEED;
    }
    return canJump;
};

hero.prototype.bounce = function () {
    const BOUNCE_SPEED = 200;
    this.body.velocity.y = -BOUNCE_SPEED;
};

hero.prototype.getAnimationName = function () {
    let name = 'stop'; // default animation

    // jumping
    if (this.body.velocity.y < 0) {
        name = 'jump';
    }
    // falling
    else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
        name = 'fall';
    }
    else if (this.body.velocity.x !== 0 && this.body.touching.down) {
        name = 'run';
    }

    return name;
};

hero.prototype.update = function () {
    // update sprite animation, if it needs changing
    let animationName = this.getAnimationName();
    if (this.animations.name !== animationName) {
        this.animations.play(animationName);
    }
};

//
// Spider (enemy)
//
function Spider(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'spider');

    // anchor
    this.anchor.set(0.5);

    // animation
    this.animations.add('crawl', [0, 1, 2], 8, true); // 8fps, looped
    this.animations.play('crawl');

    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);

    // physic properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 100;

// inherit from Phaser.Sprite
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

Spider.prototype.update = function () {
    // check against walls and reverse direction if necessary
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -Spider.SPEED; // turn left
    }
    else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = Spider.SPEED; // turn right
    }
};

Spider.prototype.die = function () {
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};


// =============================================================================
// Game States
// =============================================================================

PlayState = {};

// Preload game assets
PlayState.preload = function(){

    //Levels
    this.game.load.json('level:1', 'data/level01.json');
    
    //Images
    this.game.load.image('background', 'images/background.png');
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');
    this.game.load.spritesheet('hero', 'images/resize.png', 39, 50);
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);

    //Sounds
    this.game.load.audio('sfx:jump', 'audio/jump2.wav');
    this.game.load.audio('sfx:coin', 'audio/coin.wav');
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
}

// Create entities and world setup
PlayState.create = function(){
    this.game.add.image(0, 0, 'background');
    this.loadLevel(this.game.cache.getJSON('level:1'));

    // Create sound entities
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        stomp: this.game.add.audio('sfx:stomp')
    };
}

//Initialize keyboard listeners
PlayState.init = function(){
    this.game.renderer.renderSession.roundPixels = true;

    //Bind keys to Phaser KeyCod
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.SPACEBAR
    })

    //Add listener to allow jump
    this.keys.up.onDown.add(function () {
        let didJump = this.hero.jump();
        if (didJump) {
            this.sfx.jump.play();
        }
    }, this);
}

//Load all entities for level
PlayState.loadLevel = function(data){

    // Create a group for this game so that Phaser knows what's together
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

    data.platforms.forEach(this.spawnPlatform, this) //Call spawn for each data item in JSON

    // spawn hero and enemies
    this.spawnCharacters({
        hero: data.hero,
        spiders: data.spiders
        });

    // spawn spiders
    data.spiders.forEach(function (spider) {
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);

    // spawn important objects
    data.coins.forEach(this.spawnCoin, this);

    // Enable gravity
    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;
}

//Spawns the platforms
PlayState.spawnPlatform = function (platform) {
    let sprite = this.platforms.create(
        platform.x, platform.y, platform.image);
    this.spawnEnemyWall(platform.x, platform.y, 'left');
    this.spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
    this.game.physics.enable(sprite); //Enable physics for all platforms
    sprite.body.allowGravity = false; //But disable gravity, so they don't fall
    sprite.body.immovable = true; //And set immovable so character doesn't push platform
};

PlayState.spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    // anchor and y displacement
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);

    // physic properties
    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};

//Spawns the Characters
PlayState.spawnCharacters = function (data) {
    // Hero
    this.hero = new hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);
};

PlayState.spawnCoin = function (coin) {
    //Adds the coin location based on JSON
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);

    //Create animations so coins loop based on their pictures
    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps, looped
    sprite.animations.play('rotate');

    //Give coins gravity
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
};

//Function to determine what to do when coin overlaps hero
PlayState.onHeroVsCoin = function (hero, coin) {
    coin.kill();
    this.sfx.coin.play();
};

//Function to determine what to do when hero overlaps enemy
PlayState.onHeroVsEnemy = function (hero, enemy) {
    if (hero.body.velocity.y > 0) { // kill enemies when hero is falling
        enemy.die();
        hero.bounce();
        this.sfx.stomp.play();
    }
    else { // game over -> restart the game
        this.sfx.stomp.play();
        this.game.state.restart();
    }
};


//Handle state updates
PlayState.update = function(){
    this.handleCollisions();
    this.handleInput();
}

//Handle user inputs
PlayState.handleInput = function(){
    if(this.keys.left.isDown){
        this.hero.move(-1);
    }else if(this.keys.right.isDown){
        this.hero.move(1);
    }else {
        this.hero.move(0);
    }
}

//Handle collosions
PlayState.handleCollisions = function () {
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.overlap(this.hero, this.coins, this.onHeroVsCoin, null, this);
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.overlap(this.hero, this.spiders, this.onHeroVsEnemy, null, this);
};

// =============================================================================
// entry point
// =============================================================================

// On window load for HTML
window.onload = function(){
    let game = new Phaser.Game(960, 600, Phaser.Auto, 'game');
    game.state.add('play', PlayState);
    game.state.start('play');
}