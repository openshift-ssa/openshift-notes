document.addEventListener("DOMContentLoaded", function () {
  var links = document.querySelectorAll("a[href^='http']");
  var host = window.location.hostname;
  links.forEach(function (link) {
    if (link.hostname !== host) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
});
