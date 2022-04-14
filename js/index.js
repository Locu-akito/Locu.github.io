import * as THREE from "./libs/ThreeJS-Librarys/build/three.module.js";
import { FontLoader } from "./libs/ThreeJS-Librarys/loaders/FontLoader.js";
//import { TextGeometry } from "./libs/ThreeJS-Librarys/geometries/TextGeometry.js";


 const { Player } = TextAliveApp;

 // TextAlive Player を初期化
 const player = new Player({
   // トークンは https://developer.textalive.jp/profile で取得したものを使う
   app: { token: "R9Drc5DB4cIXpmyN", parameters: [
     {title: "背景グラデーション開始色", name: "gradationStartColor", className: "Color", iniitalValue: "#63d0e2" },
     {title: "背景グラデーション終了色", name: "gradationEndColor", className: "Color", iniitalValue: "#ff9438" },
   ] },
 
   mediaElement: document.querySelector("#media"),
   mediaBannerPosition: "bottom right",
 
   // オプション一覧
   // https://developer.textalive.jp/packages/textalive-app-api/interfaces/playeroptions.html
 });
 
 const overlay = document.querySelector("#overlay");
 const bar = document.querySelector("#bar");
 const textContainer = document.querySelector("#text");
 const seekbar = document.querySelector("#seekbar");
 const paintedSeekbar = seekbar.querySelector("div");
 const LyricOldDiv = document.querySelector("#lyricOld > #lyricOldDiv");
 let b, c;
 var lyricCount = 0, testCount = 0;
let LyricOldList = "";
 
 
 player.addListener({
   /* APIの準備ができたら呼ばれる */
   onAppReady(app) {
     if (app.managed) {
       document.querySelector("#control").className = "None";
     }
     if (!app.songUrl) {
       document.querySelector("#media").className = "None";
 
       player.createFromSongUrl("https://piapro.jp/t/RoPB/20220122172830", {
         video: {
           // 音楽地図訂正履歴: https://songle.jp/songs/2121525/history
           beatId: 4081639,
           repetitiveSegmentId: 2242466,
           // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FFDb1%2F20210213190029
           lyricId: 53718,
           //lyricDiffId: 5093,
         },
       });
     }
   },
 
   /* パラメタが更新されたら呼ばれる */
   onAppParameterUpdate: () => {
     const params = player.app.options.parameters;
     const sc = player.app.parameters.gradationStartColor, scString = sc ? `rgb(${sc.r}, ${sc.g}, ${sc.b})` : params[0].iniitalValue;
     const ec = player.app.parameters.gradationEndColor, ecString = ec ? `rgb(${ec.r}, ${ec.g}, ${sc.b})` : params[1].iniitalValue;
     document.body.style.backgroundColor = ecString;
     document.body.style.backgroundImage = `linear-gradient(0deg, ${ecString} 0%, ${scString} 100%)`;
   },
 
   /* 楽曲が変わったら呼ばれる */
   onAppMediaChange() {
     // 画面表示をリセット
     overlay.className = "";
     bar.className = "";
     resetChars();
   },
 
   /* 楽曲情報が取れたら呼ばれる */
   onVideoReady(video) {
     // 楽曲情報を表示
     document.querySelector("#artist span").textContent =
       player.data.song.artist.name;
     document.querySelector("#song span").textContent = player.data.song.name;
 
     // 最後に表示した文字の情報をリセット
     c = null;
   },
 
   /* 再生コントロールができるようになったら呼ばれる */
   onTimerReady() {
     overlay.className = "None";
     document.querySelector("#control > a#play").className = "";
     document.querySelector("#control > a#stop").className = "";
   },
 
   /* 再生位置の情報が更新されたら呼ばれる */
   onTimeUpdate(position) {
     // シークバーの表示を更新
     paintedSeekbar.style.width = `${
       parseInt((position * 1000) / player.video.duration) / 10
     }%`;
 
     // 現在のビート情報を取得
     let beat = player.findBeat(position);
     if (b !== beat) {
       if (beat) {
         requestAnimationFrame(() => {
           bar.className = "active";
           requestAnimationFrame(() => {
             bar.className = "active beat";
           });
         });
       }
       b = beat;
     }
 
     // 歌詞情報がなければこれで処理を終わる
     if (!player.video.firstChar) {
       return;
     }
 
     // 巻き戻っていたら歌詞表示をリセットする
     if (c && c.startTime > position + 1000) {
       resetChars();
     }
 
     // 500ms先に発声される文字を取得
     let current = c || player.video.firstChar;
     while (current && current.startTime < position + 500) {
       // 新しい文字が発声されようとしている
       if (c !== current) {
         newChar(current);
         c = current;
       }
       current = current.next;
     }
   },
 
   /* 楽曲の再生が始まったら呼ばれる */
   onPlay() {
     const a = document.querySelector("#control > a#play");
     while (a.firstChild) a.removeChild(a.firstChild);
     a.appendChild(document.createTextNode("\uf28b"));
   },
 
   /* 楽曲の再生が止まったら呼ばれる */
   onPause() {
     const a = document.querySelector("#control > a#play");
     while (a.firstChild) a.removeChild(a.firstChild);
     a.appendChild(document.createTextNode("\uf144"));
   },
 });
 
 /* 再生・一時停止ボタン */
 document.querySelector("#control > a#play").addEventListener("click", (e) => {
   e.preventDefault();
   if (player) {
     if (player.isPlaying) {
       player.requestPause();
     } else {
       player.requestPlay();
     }
   }
   return false;
 });
 
 /* 停止ボタン */
 document.querySelector("#control > a#stop").addEventListener("click", (e) => {
   e.preventDefault();
   if (player) {
     player.requestStop();
 
     // 再生を停止したら画面表示をリセットする
     bar.className = "";
     resetChars();
   }
   return false;
 });
 
 /* シークバー */
 seekbar.addEventListener("click", (e) => {
   e.preventDefault();
   if (player) {
     player.requestMediaSeek(
       (player.video.duration * e.offsetX) / seekbar.clientWidth
     );
   }
   return false;
 });
 
 /**
  * 新しい文字の発声時に呼ばれる
  * Called when a new character is being vocalized
  */
 function newChar(current) {
   // 品詞 (part-of-speech)
   // https://developer.textalive.jp/packages/textalive-app-api/interfaces/iword.html#pos
   const classes = [];
   if (
     current.parent.pos === "N" ||
     current.parent.pos === "PN" ||
     current.parent.pos === "X"
   ) {
     classes.push("noun");
   }
 
   // フレーズの最後の文字か否か
   if (current.parent.parent.lastChar === current) {
     classes.push("lastChar");
   }
 
   // 英単語の最初か最後の文字か否か
   if (current.parent.language === "en") {
     if (current.parent.lastChar === current) {
       classes.push("lastCharInEnglishWord");
     } else if (current.parent.firstChar === current) {
       classes.push("firstCharInEnglishWord");
     }
   } 

   if(lyricCount == 24){
    resetChars();
    lyricCount = 0;
    lyricCount++;
    // noun, lastChar クラスを必要に応じて追加
    const div = document.createElement("span");
    div.appendChild(document.createTextNode(current.text));

    // 文字を画面上に追加
    const container = document.createElement("span");
    container.className = classes.join(" ");
    container.appendChild(div);
    container.addEventListener("click", () => {
      player.requestMediaSeek(current.startTime);
    });
    textContainer.appendChild(container);

    //歌詞をLyricOldListに保存
    LyricOldList += current.text;

   }
   else
   {
    lyricCount++;
       // noun, lastChar クラスを必要に応じて追加
    const div = document.createElement("span");
    div.appendChild(document.createTextNode(current.text));
  
    // 文字を画面上に追加
    const container = document.createElement("span");
    container.className = classes.join(" ");
    container.appendChild(div);
    container.addEventListener("click", () => {
      player.requestMediaSeek(current.startTime);
    });
    textContainer.appendChild(container);

    //歌詞をLyricOldListに保存
    LyricOldList += current.text;
    console.log(LyricOldList);
   }
   LyricOldDiv.textContent = LyricOldList;


 }
 
 /**
  * 歌詞表示をリセットする
  * Reset lyrics view
  */
 function resetChars() {
   c = null;
   while (textContainer.firstChild)
     textContainer.removeChild(textContainer.firstChild);
 }



  /*Three.jsでの3Dオブジェクト*/
  /* scene(シーン)の作成 */
var scene = new THREE.Scene();

/* camera(カメラ)の作成 */
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

/* renderer(レンダラー)の作成　*/
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

/* object(オブジェクト)の作成 */
var geometry = new THREE.BoxGeometry( 1, 3, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

/*テキストオブジェクト作成*/
const loader = new FontLoader();
const font = loader.load(

  //フォントURL
  "./js/Fonts/03SmartFontUI_Regular.js",

  //処理記述
  function(font){
    console.log(font);
  },

  
)
/* camera(カメラ)の位置設定　*/
camera.position.z = 5;

/* 繰り返しの処理　*/
var animate = function () {
    requestAnimationFrame( animate );

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render( scene, camera );
};

animate();