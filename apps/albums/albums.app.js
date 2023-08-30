function getImage(idx) {
  if (!images || !images.length) {
    console.log('no image');
  }
  const i = (idx + images.length) % images.length;
  return require('heatshrink').decompress(
    atob(require('Storage').read('albums.data.' + albums[currAlbum].id + '.' + images[i].id))
  );
}

function drawImg(idx, x, y) {
  g.drawImage(getImage(idx), x ? x : 0, y ? y : 0);
}

function changeAlbum(idx, dir) {
  currAlbum =
    albums && albums.length && albums.length > currAlbum && albums[idx].images && albums[idx].images.length ? idx : 0;
  scrollOff(0, dir);
  images = albums[idx].images;
  currAlbum = idx;
  currImg = (currImg + images.length) % images.length;
  drawImg(currImg);
}

function scrollOff(dirX, dirY) {
  let i = 0;
  while (i <= w) {
    g.scroll(-dirX * 20, -dirY * 20);
    g.flip();
    i += 20;
  }
}

function changeImage(idx, dir) {
  if (!dir) dir = 1;
  scrollOff(dir, 0);
  currImg = idx;
  drawImg(currImg);
}

function onSwipe(lr, ud) {
  if (lr === 1) {
    const nxtIdx = (currImg + images.length - 1) % images.length;
    changeImage(nxtIdx, -1);
  } else if (lr === -1) {
    const nxtIdx = (currImg + 1) % images.length;
    changeImage(nxtIdx, 1);
  } else if (ud === 1) {
    const nxtAlbum = (currAlbum + albums.length - 1) % albums.length;
    changeAlbum(nxtAlbum, -1);
  } else if (ud === -1) {
    const nxtAlbum = (currAlbum + 1) % albums.length;
    changeAlbum(nxtAlbum, 1);
  }
}

let albums = require('Storage').readJSON('albums.json.data');
let images = albums && albums.length ? albums[0].images : [];
const w = g.getWidth();
let currImg = 0;
let currAlbum = 0;

Bangle.setUI('clock');
g.reset();

if (!albums) {
  g.clear()
    .setFont('Vector:30')
    .setFontAlign(0, 0)
    .drawString('No Album', w / 2, w / 2 - 30)
    .setFont('Vector:18')
    .drawString('Please upload', w / 2, w / 2 + 20)
    .drawString('through the', w / 2, w / 2 + 40)
    .drawString('App Loader', w / 2, w / 2 + 60);
} else {
  drawImg(currImg);
  Bangle.on('swipe', onSwipe);
}
