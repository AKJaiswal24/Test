<?php
session_start();
include("connect.php");

if (!isset($_SESSION['userdata'])) {
    header("location: ../form.html");
}

if (!isset($_SESSION['userdata']['vote_status']) || $_SESSION['userdata']['vote_status'] != 1) {
    echo '<script>
            alert("You have not voted yet!");
            window.location = "candidate24.php"; 
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
    <meta http-equiv="refresh" content="11;../index.php">

    <link rel="icon" href="../logo100.png" type="image/png">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>
    <title>Online Voting System</title>
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

                <form class="candidate_list">
                    <div class="inner_contain">
                        <h1>Candidates </h1>
                        <hr>
                        <div class="members">
                            <div class="scandidate ones">
                                <img src="../party_icon/<?php echo $voted_candidate["party_img"]; ?>" width="250px"
                                    class="cand_img">
                                <p class="party_nm">You have voted for:
                                    <strong><?php echo $voted_candidate["party_name"]; ?></strong></p>
                            </div>
                        </div>
                    </div>
                </form>


            <?php } ?>
        </center>
        <div class="countdown"><p>Redirecting to home page in :</p> <div id="countdown"></div></div>
                <a href="../logout.php"<button class="backbtn"><i class='bx bx-home'></i>Home Page</button></a>

    </div>
</body>
<script>

let number = document.getElementById("countdown");
let counter = 12;

setInterval(() => {
    if(counter ==0){
        clearInterval();
    }else{
    counter -= 1;
    number.innerHTML = counter ;
    }
},900  );
</script>

</html>