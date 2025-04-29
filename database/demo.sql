-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: demo
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `candidate`
--

DROP TABLE IF EXISTS `candidate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate` (
  `party_img` varchar(255) NOT NULL,
  `party_name` varchar(30) NOT NULL,
  PRIMARY KEY (`party_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate`
--

LOCK TABLES `candidate` WRITE;
/*!40000 ALTER TABLE `candidate` DISABLE KEYS */;
INSERT INTO `candidate` VALUES ('Bharat Ekta Sangh (BES).png','Bharat Ekta Sangh (BES)'),('Desh Bhakti Party (DBP).png','Desh Bhakti Party (DBP)'),('Nav Bharat Janata Party (NBJP).png','Nav Bharat Janata Party (NBJP)'),('NOTA.png','None Of the above (NOTA)'),('Nyay Aur Vikas Party (NVP).png','Nyay Aur Vikas Party (NVP)'),('Swaraj Nirmaan Party (SNP).png','Swaraj Nirmaan Party (SNP)'),('Yuva Shakti Sangathan (YSS).png','Yuva Shakti Sangathan (YSS)');
/*!40000 ALTER TABLE `candidate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `election_dates`
--

DROP TABLE IF EXISTS `election_dates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `election_dates` (
  `State` varchar(30) NOT NULL,
  `date` date NOT NULL,
  `type` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `election_dates`
--

LOCK TABLES `election_dates` WRITE;
/*!40000 ALTER TABLE `election_dates` DISABLE KEYS */;
INSERT INTO `election_dates` VALUES ('Maharashtra','2025-04-05','Lok Sabha'),('Goa','2025-03-23','Lok Sabha'),('West Bengal','2025-03-26','Lok Sabha'),('Punjab','2025-04-01','Lok Sabha'),('Assam','2025-04-03','Lok Sabha'),('Tamil Nadu','2025-03-29','Lok Sabha'),('Karnataka','2025-04-08','Lok Sabha'),('Maharashtra','2025-05-17','Vidhan Sabha');
/*!40000 ALTER TABLE `election_dates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `voter_list`
--

DROP TABLE IF EXISTS `voter_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voter_list` (
  `aadhaar_no` bigint NOT NULL,
  `name` varchar(30) NOT NULL,
  `mobile` bigint DEFAULT NULL,
  `dob` date NOT NULL,
  `otp` int DEFAULT NULL,
  `vote_status` tinyint(1) DEFAULT NULL,
  `state` varchar(20) NOT NULL,
  `party_name` varchar(30) DEFAULT NULL,
  `voter_id` varchar(10) DEFAULT NULL,
  `ward_no` int DEFAULT NULL,
  `polling_area` varchar(255) DEFAULT NULL,
  `vote_time` time DEFAULT NULL,
  PRIMARY KEY (`aadhaar_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `voter_list`
--

LOCK TABLES `voter_list` WRITE;
/*!40000 ALTER TABLE `voter_list` DISABLE KEYS */;
INSERT INTO `voter_list` VALUES (385092746130,'Ranjit Yadav',0,'2006-12-07',0,0,'Maharashtra',NULL,NULL,NULL,NULL,NULL),(437509182364,'Kafiya Chougule',8450918962,'2005-06-07',7082,0,'Maharashtra',NULL,'LKO9182736',143,'The Indian Public School',NULL),(567812349876,'Rajesh Kumar',0,'1985-06-12',0,0,'Uttar Pradesh',NULL,'UPV1234567',140,'Gomti nagar, lucknow',NULL),(691203847590,'Sammer shaikh',9892419994,'2002-09-21',7216,0,'Maharashtra',NULL,'BPL3092847',143,'The Indian Public School',NULL),(695700620643,'Shubham kasar',0,'1997-11-12',9084,0,'Maharashtra',NULL,'SUR4638290',169,'National Public School',NULL),(768054505322,'Nupur Chaudhari',9137859377,'2003-12-22',2674,0,'Maharashtra',NULL,'MUM5728391',120,'IB International School','09:55:05'),(793614820359,'Akshay Jaiswal',7506168740,'2004-10-15',5022,0,'Maharashtra',NULL,'PUN3948573',124,'Amity International School',NULL),(948372615084,'Mamta Yadav',9819557437,'2005-05-01',3391,0,'Maharashtra',NULL,'BNG9837452',156,'Ryan International School',NULL);
/*!40000 ALTER TABLE `voter_list` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-04-29 22:35:09
