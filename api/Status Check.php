<?php
include("connect.php");

$aadhaar = $_POST["aadhaarinp"];


$check = mysqli_query($connect, " SELECT * FROM voter_list WHERE aadhaar_no='$aadhaar' ");


    $userdata = mysqli_fetch_array($check);

    $statusis= $userdata["vote_status"];
    echo"$statusis";


?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <button width="100px" height="100px"></button>
</body>
</html>