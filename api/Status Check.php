<?php
include("connect.php");

$aadhaar = $_POST["aadhaarinp"];


$check = mysqli_query($connect, " SELECT * FROM voter_list WHERE aadhaar_no='$aadhaar' ");


$userdata = mysqli_fetch_array($check);

$name = $userdata["name"];
$aadhaar = $userdata["aadhaar_no"];
$mobile = $userdata["mobile"];
$statusis = $userdata["vote_status"];
$party_name = $userdata["party_name"];
$vtime = $userdata["vote_time"];

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
      <form method="post" class="data1" id="data1">
        <div class="title">Status of </div>
        <div class="oneline">
          <p>Name: <span class="highlight_txt"> <?php echo $name ?> </span></p>
        </div>
        <div class="oneline">
          <p>Addhaar no: <span class="highlight_txt"> <?php echo $aadhaar ?> </span></p>
        </div>
        <div class="oneline">
          <p>Mobile: <span class="highlight_txt"> <?php echo $mobile ?> </span></p>
        </div>
        <div class="oneline">
          <p>Vote Status: <span class="highlight_txt"> <?php echo $status; ?></span></p>
        </div>
        <div class="oneline">
          <p>Voted To: <span class="highlight_txt"> <?php echo $party_name; ?></span></p>
        </div>
        <div class="oneline">
          <p>Voted Time: <span class="highlight_txt"> <?php echo $vtime; ?></span></p>
        </div>
      </form>
    </div>
  </center>
  <div style="height:200px"></div>
  <center><a href="Status check.html" class="backbtn"><i class='bx bx-left-arrow-alt'></i>Back</a></center>



  <footer class="footer">
    <div class="frow">
      <div class="col">
        <img src="../logo.png" class="logo" alt="" srcset="">
        <h3>A easy and new way to vote </h3>
      </div>
      <div class="col">
        <h3>Contact us <div class="underline"><span></span></div>
        </h3>
        <p class="email_id">example1@gmail.com</p>
        <h4>1234567890</h4>
      </div>
      <div class="col">
        <h3>About us <div class="underline"><span></span></div>
          <a href="../about.html">
            <h3>OVS</h3>
          </a>
        </h3>
      </div>
    </div>
    <hr>
    <p class="rights">online voting system</p>
  </footer>
</body>

</html>