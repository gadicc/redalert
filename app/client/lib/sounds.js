// based on http://stackoverflow.com/questions/8436633/preload-mp3-file-before-using-the-play-button
// thanks gilly3, misc mods by gadi

preloadSound = function(src) {
    var sound = document.createElement("audio");
    if (sound.play) {
        sound.autoPlay = false;
    } else {
        sound = document.createElement("bgsound");
        sound.volume = -10000;
	src = src.replace(/ogg$/, 'mp3');
	sound.play = function() {
		this.volume = 0;
		this.src = src;
	}
    }
    sound.src = src;
    document.body.appendChild(sound);
    return sound;
}

/*

var sound = preloadSound("/mySound.ogg");  //  preload
sound.play();

The only caveat is FireFox doesn't support mp3. You'll have to convert your files to ogg.

*/



