<?php

session_start();
echo "<script>
        window.location.href = 'index.php';
    </script>";

    
    session_unset();  
    session_destroy(); 

    ?>