<?php

include("connect.php");
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $aadhaar = $_POST['aadhaar_no'];
    $name = $_POST['name'];
    $mobile = $_POST['mobile'];
    $dob = $_POST['dob'];
    $state = $_POST['state'];
    $voterid = $_POST['voterid'];
    $ward = $_POST['ward'];
    $polling = $_POST['polling'];


    $query = mysqli_query($connect, "INSERT INTO voter_list(aadhaar_no,name,mobile,dob,state,voter_id,ward_no,polling_area)
     VALUES('$aadhaar','$name','$mobile','$dob','$state','$voterid','$ward','$polling') ");
    if ($query) {
        echo ' <script>
    alert("Added");
    window.location = "admin.html";
    </script>';
    }
}
?>


<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Voting System</title>
    <link rel="stylesheet" href="../style.css">
</head>

<body>
    <center>
        <div class="vote_now">
            <form action="" method="post" enctype="multipart/form-data" class="data1" id="data1">
                <div class="title">ADD Candidate</div>
                <label>Aadhaar no</label>
                <input type="text" name="aadhaar_no" maxlength="12" minlength="12" required>
                <label>Name</label>
                <input type="text" name="name" required>
                <label>Mobile no</label>
                <input type="test" name="mobile" maxlength="10" minlength="10" required>
                <label>DOB</label>
                <input type="date" name="dob" required>
                <label>State</label>
                <input type="text" name="state" required>
                <label>Voter id</label>
                <input type="text" name="voterid" maxlength="10" minlength="10" required>
                <label>Ward no</label>
                <input type="text" name="ward" maxlength="3" minlength="3" required>
                <label>Polling no</label>
                <input type="text" name="polling" required>
                <button type="submit" class="user_verify">Save</button>
            </form>
        </div>
    </center>
</body>

</html>