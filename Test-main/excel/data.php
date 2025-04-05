<?php
require '../api/connect.php';


?>


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <table border="1">
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
        </tr>
        <?php endforeach; ?>
    </table>
</body>
</html>