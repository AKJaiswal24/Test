<?php
session_start();
if (!isset($_SESSION['userdata'])) {
    header("location: ../form.html");
}

$userdata = $_SESSION['userdata'];
$aadhaar =$userdata['aadhaar_no'];
include("api/connect.php");

$run = mysqli_query($connect,"SELECT * FROM voter_list WHERE aadhaar_no=$aadhaar");
$query=mysqli_fetch_array($run); 
$mobile= $query["mobile"];



?>


<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    
    <link rel="icon" href="logo100.png" type="image/png">

    <link rel="stylesheet" href="style.css">
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
    <center>
        <form action="api/otp.php" method="post" class="otpcontainer">
            <div class="content">
                <p>Enter OTP</p>
                    <p>For verification a otp is sent to:<?php echo $mobile ?></p>
                <div class="oneline">
                    <p> Your OTP:</p>
                    <p><?php echo $userdata["otp"] ?></p>
                </div>
                <div class="inp">

                    <input type="text" inputmode="numeric" id="input" name="otpnm" autocomplete="off" maxlength="4"
                        required>
                </div>
                <button class="otp_btn" id="otp_btn">Verify</button>
            </div>
        </form>
    </center>

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
        <a href="about.html"><h3>OVS</h3></a>
        </h3>
      </div>
    </div>
    <hr>
    <p class="rights">online voting system</p>
  </footer>


</body>

</html>


<!-- <input id="idTxtBx_OTC_Password" data-testid="idTxtBx_OTC_Password" name="otc" placeholder="Enter code" type="tel" maxlength="10" aria-label="Enter the code you received" aria-describedby="oneTimeCodeTitle  oneTimeCodeDescription" class="ext-input ext-text-box" value=""> -->