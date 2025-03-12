<?php
session_start();
include("connect.php");

if (!isset($_SESSION['userdata']['vote_status']) || $_SESSION['userdata']['vote_status'] != 1) {
    echo '<script>
            alert("You have not voted yet!");
            window.location = "candidate_page.php"; 
          </script>';
    exit();
}
$aadhaar = $_SESSION['userdata']['aadhaar_no'];
$result = $connect->query("SELECT * FROM candidate WHERE party_name = '{$_SESSION['voted_party']}'");
$voted_candidate = $result->fetch_assoc();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!-- <meta http-equiv="refresh" content="10;../index.html"> -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vote Confirmation</title>
    <link rel="stylesheet" href="../style.css">
</head>

<body>
    <nav class="f_nam">
        <div class="con1">
            <img src="../logo.png" alt="">
            <p>Online Voting System</p>
        </div>
    </nav>
    <hr>
    <div class="cand_container">
        <center>
        <h1>Vote Confirmation</h1>
        
        <?php if ($voted_candidate) { ?>

            <form class="candidate_list"><div class="inner_contain">
        <h1>Candidates  </h1>
        <hr>
        <div class="members">
            <div class="scandidate ones">
            <img src="../party_icon/<?php echo $voted_candidate["party_img"]; ?>" width="250px" class="cand_img">
            <p class="party_nm">You have voted for: <strong><?php echo $voted_candidate["party_name"]; ?></strong></p>
            </div>
        </div>
        </div>
    </form>


        <?php } ?>
        </center>
        <a href="../index.html"><button class="vote_btn">Go to Home</button></a>
    </div>
</body>
</html>
