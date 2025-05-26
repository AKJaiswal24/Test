<?php
require '../connect.php';
session_start();
// include("connect.php");

$result = $connect->query("SELECT * FROM candidate ORDER BY party_name = 'None Of the above (NOTA)';");
$candidates = mysqli_fetch_all($result, MYSQLI_ASSOC);
$_SESSION['candidates'] = $candidates;

$totalcandidate = $result->num_rows;


?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
table{
    border-collapse: collapse;
}
td,th{
    border: 1px solid black;
}
</style>
</head>
<body>
    <h1>Voter list</h1>
    <table>
        <tr>
            <td>#</td>
            <td>Aadhaar no</td>
            <td>Name</td>
            <td>Mobile no</td>
            <td>DOB</td>
            <td>Voting Status</td>
            <td>Voter id</td>
            <td>Ward no</td>
            <td>Polling Area</td>
            <td>State</td>
            <td>Party Name</td>
            <td>Voting Time</td>
        </tr>
        <?php
        $i=1;
        $rows= mysqli_query($connect,"SELECT * FROM voter_list");

        foreach($rows as $row):
        ?>
        <tr>
            <td><?php echo $i++; ?></td>
            <td><?php echo $row["aadhaar_no"]; ?></td>
            <td><?php echo $row["name"]; ?></td>
            <td><?php echo $row["mobile"]; ?></td>
            <td><?php echo $row["dob"]; ?></td>
            <td><?php echo $row["vote_status"]; ?></td>
            <td><?php echo $row["voter_id"]; ?></td>
            <td><?php echo $row["ward_no"]; ?></td>
            <td><?php echo $row["polling_area"]; ?></td>
            <td><?php echo $row["state"]; ?></td>
            <td><?php echo $row["party_name"]; ?></td>
            <td><?php echo $row["vote_time"]; ?></td>
        </tr>
        <?php endforeach; ?>
    </table>
    <hr>
    <hr>
    <h1>Candidate</h1>
<table>
    <tr>
        <th>Party Name</th>
        <th>Votes</th>
    </tr>
    <?php
  if($_SESSION['candidates']){
    for($i=0;$i<$totalcandidate;$i++){
      ?>

    <?php $nmparty =  $candidates[$i]["party_name"];   ?>
    <?php $query =mysqli_fetch_assoc( mysqli_query($connect,
    "SELECT COUNT(*) AS count FROM voter_list WHERE party_name = '$nmparty' "));?>
<tr> <td> <?php  echo $nmparty ?></td> 
<td> <?php  echo $query['count']; ?></td> </tr>

<?php
    }
  } 
  ?>
</table>







</div>
</body>
</html>