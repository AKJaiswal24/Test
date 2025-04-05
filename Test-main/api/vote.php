<?php

session_start();
include 'connect.php';

if (!isset($_SESSION['userdata'])) {
    die("Session expired. Please log in again.");
}

$userdata = $_SESSION['userdata'];
$aadhaar = $userdata['aadhaar_no'];
$vote_status = $userdata['vote_status'];

if ($vote_status == 1) {
    echo ' <script>
            alert("Your vote already exist")
        window.location = "../index.php";
        </script>';
}

if (!isset($_POST['party_name']) || !isset($_POST['can_vote'])) {
    die("Invalid vote submission.");
}

$party_name = $_POST['party_name'];
$can_vote = (int) $_POST['can_vote'];
$total_votes = $can_vote + 1;

$update_votes = mysqli_query($connect, "UPDATE candidate SET total_vote = '$total_votes' WHERE party_name = '$party_name'");

$update_user_status = mysqli_query($connect, "UPDATE voter_list SET vote_status = 1, party_name='$party_name' WHERE aadhaar_no = '$aadhaar'");

if ($update_votes && $update_user_status) {

    $can = mysqli_query($connect, "SELECT * FROM candidate");
    $_SESSION['candidates'] = mysqli_fetch_all($can, MYSQLI_ASSOC);
    $_SESSION['userdata']['vote_status'] = 1;
    $_SESSION['voted_party'] = $party_name;

    echo '<script>
            alert("Your vote has been successfully cast!");
            window.location = "review_vote.php";
        </script>';
} else {
    echo "Database update failed: " . mysqli_error($connect);
}
























// session_start();
// include 'connect.php';

// $userdata = $_SESSION['userdata'];
// $aadhaar = $userdata['aadhaar_no'];

// $party_name = $_POST['party_name'];  // Get selected party name
// $can_vote = $_POST['can_vote'];  
// $total_votes = $can_vote + 1;

// // Update candidate votes
// $update_votes = mysqli_query($connect, "UPDATE candidate SET total_votes = '$total_votes' WHERE party_name = '$party_name'");

// // Update user vote status
// $update_user_status = mysqli_query($connect, "UPDATE aadhaar SET vote_status = 1 WHERE aadhaar_no = '$aadhaar'");

// if ($update_votes && $update_user_status) {
//     $_SESSION['userdata']['vote_status'] = 1;
//     $_SESSION['voted_party'] = $party_name; // Store voted party in session

//     echo '<script>
//             alert("Your vote has been recorded successfully!");
//             window.location = "review_vote.php";
//           </script>';
// } else {
//     echo "Database update failed: " . mysqli_error($connect);
// }










?>