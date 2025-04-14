<?php

session_start();
include 'connect.php';

if (!isset($_SESSION['user_id'])) {
    echo "User not logged in.";  
    header("Location: form.html");
    exit();
}

echo "<script>
        localStorage.removeItem('orders');
        window.location.href = 'index.php';
    </script>";

    
    session_unset();  
    session_destroy(); 

    ?>