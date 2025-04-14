<?php

include("api/connect.php");

$today1 = date("d-m-y");
$today = date("y-m-d");

$result = mysqli_query($connect, "SELECT SUM(total_vote) AS total_votes FROM candidate;");

$fetch = mysqli_fetch_array($result);
$totalcandidatevote = $fetch["total_votes"];
echo $totalcandidatevote;

$query = mysqli_query($connect, "SELECT * FROM election_dates WHERE date='$today' ");
$checkfetch = mysqli_fetch_array($query);

if ($checkfetch == NULL) {
    $ann= "No Election's Today";
    $election_type = "?";
}else{
    $election_type = $checkfetch["type"];
  $statevote = $checkfetch['State'];
  $ann="Today $today1 is $election_type election for the state of $statevote ";
}


?>

<?php echo $ann ?>


<?php  echo $election_type; ?> 
