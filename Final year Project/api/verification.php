<?php



session_start();
include("connect.php");


    $userdata = $_SESSION['userdata'];
    $birth = $userdata["dob"];
    $today = date("y-m-d");
    $diff = date_diff(date_create($birth), date_create($today));
    $age = $diff->format('%y');

    $status = $userdata["status"];

    if($age>18){
        if($status == 0){
            echo ' <script>
        window.location = "../Candidate_page.html";
        </script>';
        }
        else{
            echo ' <script>
            alert("Your vote already exist")
        window.location = "../index.html";
        </script>';   
        }
        
    }
else{ 
    echo ' <script>
        alert("You are not mature enough to vote");
        window.location = "../index.html";
        </script>';
}

?>
