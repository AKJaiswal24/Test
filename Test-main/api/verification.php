<?php

session_start();
include("connect.php");
if (!isset($_SESSION['userdata'])) {
    header("location: ../form.html");
}


$userdata = $_SESSION['userdata'];
$birth = $userdata["dob"];
$today = date("y-m-d");
$diff = date_diff(date_create($birth), date_create($today));
$age = $diff->format('%y');

$vote_status = $userdata["vote_status"];

if ($age > 18) {
    if ($vote_status == 0) {
        echo ' <script>
        window.location = "candidate24.php";
        </script>';
    } else {
        echo ' <script>
            alert("Your vote already exist")
        window.location = "../index.php";
        </script>';
    }

} else {
    echo ' <script>
        alert("Invalid age to vote");
        window.location = "../index.php";
        </script>';
}

?>