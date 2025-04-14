let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");
closeBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  menuBtnChange();
});
searchBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  menuBtnChange();
});

function menuBtnChange() {
  if (sidebar.classList.contains("open")) {
    closeBtn.classList.replace("bx-menu", "bx-menu-alt-right");
  } else {
    closeBtn.classList.replace("bx-menu-alt-right", "bx-menu");
  }
}


const date = new Date();
document.getElementById('formattedDate').textContent = date.toLocaleDateString();



//  countdown
let number = document.getElementById("number");
let counter = 6;

setInterval(() => {
    if(counter ==0){
        clearInterval();
    }else{
    counter -= 1;
    number.innerHTML ="Redirecting to home page" +  counter ;
    }
},900  );