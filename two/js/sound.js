// Plays the sound matched by name provided.
function playSound(name) {

    switch (name) {
        case 'gala':
        var sound = document.getElementById("gala"); break;
        case 'honey':
        var sound = document.getElementById("honey"); break;
        case 'granny':
        var sound = document.getElementById("granny"); break;
    }
        sound.play()
}