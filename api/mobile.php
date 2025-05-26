<?php
include("connect.php");
session_start();
if (!isset($_SESSION['userdata'])) {
    header("location: ../form.html");
}
$userdata = $_SESSION['userdata'];

$aadhaar= $userdata['aadhaar_no'];

$mobile = $userdata['mobile'];
if(empty($mobile)){
$mobile = $_POST['mobno'];
$query= mysqli_query($connect,"UPDATE voter_list SET mobile=$mobile WHERE aadhaar_no=$aadhaar ");

if ($query) {
    echo ' <script>
    window.location = "../otppage.php";
    </script>';
}
else {
    echo ' <script>
    alert("Something went wrong");
    window.location = "../index.php";
    </script>';
}
}
?>