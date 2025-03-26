<?php
include("api/connect.php");

$today = date("y-m-d");
echo $today;
echo $today;

$query=mysqli_query($connect,"SELECT * FROM election_dates WHERE Date='$today' ");
$checkfetch = mysqli_fetch_array($query);
$statevote = $checkfetch['State'];
echo $statevote;
?>