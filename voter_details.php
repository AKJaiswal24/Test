<?php
include("api/connect.php");

$aadhaar = $_POST["aadhaarinp"];


$check = mysqli_query($connect, " SELECT * FROM voter_list WHERE aadhaar_no='$aadhaar' ");


$userdata = mysqli_fetch_array($check);

$name = $userdata["name"];
$aadhaar = $userdata["aadhaar_no"];
$mobile = $userdata["mobile"];
$voter_id = $userdata["voter_id"];
$ward_no = $userdata["ward_no"];
$polling_area = $userdata["polling_area"];


?>

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <link rel="icon" href="logo100.png" type="image/png">

  <link rel="stylesheet" href="style.css">

  <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">

  <title>Online Voting System</title>
  <style>
    .oneline {
      display: flex;
      flex-direction: row;
    }
  </style>
</head>

<body>

  <nav class="f_nam">
    <div class="con1">
      <img src="logo.png" alt="">
      <p>Online Voting System</p>
    </div>
  </nav>
  <hr>


  <div class="sidebar">
    <div class="logo-details">
      <div class="logo_name">Online Voting</div>
      <i class='bx bx-menu' id="btn"></i>
    </div>
    <ul class="nav-list">
      <li>
        <i class='bx bx-search'></i>
        <input type="text" placeholder="Search...">
        <span class="tooltip">Search</span>
      </li>
      <li>
        <a href="index.php">
          <i class='bx bx-home'></i>
          <span class="links_name">Home</span>
        </a>
        <span class="tooltip">Home</span>
      </li>
      <li>
        <a href="form.html">
          <i class="fa-solid fa-square-poll-vertical"></i>
          <span class="links_name">Vote Now</span>
        </a>
        <span class="tooltip">Vote Now</span>
      </li>
      <li>
        <a href="announcement.php">
          <i class="fa-solid fa-bullhorn icon"></i>
          <span class="links_name">Announcement</span>
        </a>
        <span class="tooltip">Announcement</span>
      </li>
      <li>
        <a href="Nominee.php">
          <i class="fa-solid fa-person"></i>
          <span class="links_name">Nominee</span>
        </a>
        <span class="tooltip">Nominee</span>
      </li>
      <li>
        <a href="voter_details.html">
          <i class='bx bx-detail'></i>
          <span class="links_name">Details</span>
        </a>
        <span class="tooltip">Details</span>
      </li>
      <!-- <li>
        <a href="#">
          <i class="fa-solid fa-headset icon"></i>
          <span class="links_name">Customer Support</span>
        </a>
        <span class="tooltip">Customer Support</span>
      </li> -->
    </ul>
  </div>


  <section class="home-section">

    <center>

      <div class="vote_now">
        <form action="" method="post" class="data1" id="data1">
          <div class="title">Know Your details</div>
          <div class="oneline">
            <p>Name: <span class="highlight_txt"> <?php echo $name ?></span></p>
          </div>
          <div class="oneline">
            <p>Addhaar no: <span class="highlight_txt"> <?php echo $aadhaar ?> </span></p>
          </div>
          <div class="oneline">
            <p>Voter id: <span class="highlight_txt"><?php echo $voter_id ?></span> </p>
          </div>
          <div class="oneline">
            <p>Mobile: <span class="highlight_txt"> <?php echo $mobile ?> </span> </p>
          </div>
          <div class="oneline">
            <p>Ward no: <span class="highlight_txt"> <?php echo $ward_no ?> </span> </p>
          </div>
          <div class="oneline">
            <p>Polling area: <span class="highlight_txt"> <?php echo $polling_area ?></span> </p>
          </div>

        </form>
      </div>
      <div style="height:250px"></div>
    </center>
  </section>


  
  <footer class="footer">
    <div class="frow">
      <div class="col">
        <img src="logo.png" class="logo" alt="" srcset="">
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
          <a href="about.html">
            <h3>OVS</h3>
          </a>
        </h3>
      </div>
    </div>
    <hr>
    <p class="rights">online voting system</p>
  </footer>



</body>
<script src="script.js"></script>

</html>