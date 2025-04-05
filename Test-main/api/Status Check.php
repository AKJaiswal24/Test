<?php
include("connect.php");

$aadhaar = $_POST["aadhaarinp"];


$check = mysqli_query($connect, " SELECT * FROM voter_list WHERE aadhaar_no='$aadhaar' ");


$userdata = mysqli_fetch_array($check);

$name = $userdata["name"];
$aadhaar = $userdata["aadhaar_no"];
$mobile = $userdata["mobile"];
$statusis = $userdata["vote_status"];

if ($statusis == 1) {
  $status = '<button style="background:lightgreen;width:100px; color:black; font-weight:800; height: 50px; border-radius: 10px;" disabled>Voted</button>';
} else {
  $status = '<button style="background:red;width: 100px; color:white; height: 50px; border-radius: 10px;" disabled>Not Voted</button>';
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="../style.css">
  <link rel="icon" href="../logo100.png" type="image/png">
  <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>
  <title>Online Voting System</title>
</head>

<body>

  <nav class="f_nam">
    <div class="con1">
      <img src="../logo.png" alt="">
      <p>Online Voting System</p>
    </div>
  </nav>
  <hr>


  <center>

    <div class="vote_now">
      <form action="" method="post" class="data1" id="data1">
        <div class="title">Status of </div>
        <p>Name: <?php echo $name ?> </p>
        <p>Addhaar no: <?php echo $aadhaar ?> </p>
        <p>Mobile: <?php echo $mobile ?> </p>
        <p>Vote Status: <?php echo $status; ?></p>
      </form>
    </div>
  </center>
  <a href="Status Check.html" class="backbtn"><i class='bx bx-left-arrow-alt'></i>Back</a>

</body>

</html>