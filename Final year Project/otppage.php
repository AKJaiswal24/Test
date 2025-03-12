<?php
session_start();
if(!isset($_SESSION['userdata'])){
    header("location: ../vote.html");
}

    $userdata = $_SESSION['userdata'];

?>


<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="style.css">
    <style>
        .oneline{
            display: flex;
            flex-direction:row;
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
            <p>Enter opt</p>
            <div class="oneline">
                <p for="">Aadhaar:</p> <p><?php echo $userdata["aadhaar_no"] ?></p>
            </div>
             <div class="inp">
           
                <input type="text" inputmode="numeric" id="input" name="otpnm" autocomplete="off" maxlength="4" required>
            </div>
            <button class="otp_btn" id="otp_btn">Verify</button>
        </div>
    </form>
    </center>
    <!-- <a href="Candidate_page.html">Next page</a> -->
</body>

</html>


<!-- <input id="idTxtBx_OTC_Password" data-testid="idTxtBx_OTC_Password" name="otc" placeholder="Enter code" type="tel" maxlength="10" aria-label="Enter the code you received" aria-describedby="oneTimeCodeTitle  oneTimeCodeDescription" class="ext-input ext-text-box" value=""> -->