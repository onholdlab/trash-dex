// 防止 Threads / IG 內建瀏覽器在上下拖曳時把整個頁面滑走。
// 做法：body 固定不捲動，所有內容放在 #app 內部捲動；
// 捲到最頂／最底時攔下繼續往外拉的 touchmove，避免捲動鏈結到 WebView 本身。
(function () {
  var app = document.getElementById('app');
  if (!app) return;
  var startY = 0;

  app.addEventListener('touchstart', function (e) {
    startY = e.touches[0].clientY;
    // 停在 0 或最底時 iOS 會把手勢交給外層；先退一像素避免。
    if (app.scrollTop <= 0) app.scrollTop = 1;
    var max = app.scrollHeight - app.clientHeight;
    if (app.scrollTop >= max) app.scrollTop = max - 1;
  }, { passive: true });

  app.addEventListener('touchmove', function (e) {
    var dy = e.touches[0].clientY - startY;
    var max = app.scrollHeight - app.clientHeight;
    var atTop = app.scrollTop <= 0 && dy > 0;
    var atBottom = app.scrollTop >= max && dy < 0;
    if (atTop || atBottom || max <= 0) e.preventDefault();
  }, { passive: false });

  // body 本身永遠不准被拖
  document.body.addEventListener('touchmove', function (e) {
    if (!app.contains(e.target)) e.preventDefault();
  }, { passive: false });
})();
