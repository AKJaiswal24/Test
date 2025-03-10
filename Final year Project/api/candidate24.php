<?php
session_start();
include("connect.php");

$result = $connect->query("SELECT * FROM candidate");
$candidates = mysqli_fetch_all($result, MYSQLI_ASSOC);
$_SESSION['candidates'] = $candidates;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Voting System</title>
    <link rel="stylesheet" href="../style.css">
    <link href='https://unpkg.com/boxicons@2.0.7/css/boxicons.min.css' rel='stylesheet'>
</head>

<body>
    <nav class="f_nam">
        <div class="con1">
            <img src="../YCMOU logo.png" alt="">
            <h4>University name</h4>
            <p>YCMOU</p>
        </div>
        <div class="con2">
            <img src="../logo.png" alt="">
            <p>Online Voting System</p>
        </div>
    </nav>
    <hr>

    <div class="cand_container">
        <h1>Candidates</h1>

        <?php foreach ($candidates as $candidate) { ?>
            <form action="vote.php" method="post">
                <div class="candi">
                    <div class="align">
                        <img src="../party_icon/<?php echo $candidate["party_img"]; ?>" class="cand_img">
                        <p class="party_nm">Party Name: <?php echo $candidate["party_name"]; ?></p>
                        <p>Votes: <?php echo $candidate["total_vote"]; ?></p>

                        <input type="hidden" name="party_name" value="<?php echo $candidate["party_name"]; ?>">
                        <input type="hidden" name="can_vote" value="<?php echo $candidate["total_vote"]; ?>">

                        <button type="submit" class="vote_btn">
                            <div class="icon-wrapper-1">
                                <div class="icon-wrapper">
                                    <i class='bx bxs-hand-up bx-flip-horizontal'></i>
                                </div>
                            </div>
                            <span>Vote</span>
                        </button>
                    </div>
                </div>
            </form>   
        <?php } ?>

    </div>
</body>
</html>
