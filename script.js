let menuIcon = document.querySelector('#menuicon');
let navbar = document.querySelector('.menubar');

menuIcon.onclick = () => {
    menuIcon.classList.toggle('fa-x');
    navbar.classList.toggle('active')
}

    let header = document.querySelector('header')
    header.classList.toggle('sticky',window.scrollY > 100);

    
    menuIcon.classList.remove('fa-x');
    navbar.classList.remove('active')
