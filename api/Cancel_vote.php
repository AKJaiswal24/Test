<?php
include 'connect.php';

$aadhaar = $_POST["aadhaarinp"];

$userdata= mysqli_fetch_array(mysqli_query($connect,"SELECT * FROM voter_list WHERE aadhaar_no='$aadhaar' "));
$party_name=$userdata['party_name'];

// $candidatedata= mysqli_fetch_array(mysqli_query($connect,"SELECT * FROM candidate WHERE party_name='$party_name' "));
// $votes= $candidatedata['total_vote'] - 1;

$remove_user_vote = mysqli_query($connect, "UPDATE voter_list SET vote_status=0,party_name=NULL,vote_time=NULL WHERE aadhaar_no='$aadhaar'");
// $remove_cand_vote = mysqli_query($connect,"UPDATE candidate SET total_vote=$votes WHERE party_name='$party_name' ");

if ($remove_user_vote) {


    echo '<script>
            alert("user can vote again");
            window.location = "admin.html";
        </script>';
} else {
    echo "Database update failed: " . mysqli_error($connect);
}

?>
