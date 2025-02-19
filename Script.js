const body = document.querySelector("body"),
      slidebar = body.querySelector(".slidebar"),
      toggle = body.querySelector(".toggle"),
      searchBtn = body.querySelector(".search_box"),
      modeSwitch = body.querySelector(".toggle_switch");
      modeText = body.querySelector(".mode_text");

    //   toggle.addEventListner("click", () => {
    //     slidebar.classList.toggle("close");
    //     });


        modeSwitch.addEventListener("click" , () => {
            body.classList.toggle("dark");

            if(body.classList.contains("dark")){
                modeText.innerText = "Light Mode"
            }
            else{
                modeText.innerText = "Light Mode"
            }
        });
