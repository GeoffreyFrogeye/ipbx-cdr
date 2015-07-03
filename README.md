# ipbx-cdr
This is a web application that gives statistics about Call Data Record (CDR) for the IPBX called Asterisk. With it, you can get the average pick up time, a graph of the call duration for any given period of time, a pie chart about how calls end, and many more!

##Installation

###Setting up Asterisk

Note that you will need to activate a feature in Asterisk that saves the CDR to a database. Please note that the statistics will begin at the date the feature was activated.

You will need to setup a MySQL database, and add an user named `asterisk` and a database `asterisk` which belong to the user. You'll need to fill it with the following table:

```sql
CREATE DATABASE asterisk;

GRANT INSERT
  ON asterisk.*
  TO asterisk@localhost
  IDENTIFIED BY 'yourpassword';

USE asterisk;

CREATE TABLE `bit_cdr` (
`calldate` datetime NOT NULL default '0000-00-00 00:00:00',
`clid` varchar(80) NOT NULL default '',
`src` varchar(80) NOT NULL default '',
`dst` varchar(80) NOT NULL default '',
`dcontext` varchar(80) NOT NULL default '',
`channel` varchar(80) NOT NULL default '',
`dstchannel` varchar(80) NOT NULL default '',
`lastapp` varchar(80) NOT NULL default '',
`lastdata` varchar(80) NOT NULL default '',
`duration` int(11) NOT NULL default '0',
`billsec` int(11) NOT NULL default '0',
`disposition` varchar(45) NOT NULL default '',
`amaflags` int(11) NOT NULL default '0',
`accountcode` varchar(20) NOT NULL default '',
`userfield` varchar(255) NOT NULL default '',
`uniqueid` VARCHAR(32) NOT NULL default '',
`linkedid` VARCHAR(32) NOT NULL default '',
`sequence` VARCHAR(32) NOT NULL default '',
`peeraccount` VARCHAR(32) NOT NULL default ''
);

ALTER TABLE `bit_cdr` ADD INDEX ( `calldate` );
ALTER TABLE `bit_cdr` ADD INDEX ( `dst` );
ALTER TABLE `bit_cdr` ADD INDEX ( `accountcode` );
```

You'll also need to edit the file `/etc/asterisk/cdr_mysql.conf` and set the following:

```conf
[global]
hostname=localhost
dbname=asterisk
table=bit_cdr
user=asteriskuser
password=asteriskpass
```

More information [here](http://www.voip-info.org/wiki/view/Asterisk+cdr+mysql).

###Installing the application

`apache≥2` and `php≥5.6` with the extension `mysqli` have to be installed and running.

You can download a pre-built version of `ipbx-cdr` at <https://github.com/GeoffreyFrogeye/ipbx-cdr/releases>, which you may extract to `/var/www/`.
You should be able to access it via `http://localhost/ipbx-cdr`, an username and a password will be asked.

Set the user and password combination needed to access the application using `htpasswd -cb .htpasswd user pass` (more information [here](http://httpd.apache.org/docs/2.4/en/programs/htpasswd.html)). You'll then need to modify the file `.htaccess` to make the `AuthUserFile` point to the newly created `.htpasswd` file. 

###Setting up the application

Create a `.env` file and file in the following:

```bash
DB_HOST=localhost
DB_NAME=asterisk
DB_USER=ibxcdruser
DB_PASS=ibxcdrpass

TIMEZONE=Europe/Paris
```

The user must be able to read the database `asterisk`, and the timezone must be a [PHP supported timezone](http://php.net/manual/en/timezones.php), which correspond to the one that Asterisk uses (usually the system timezone).

##Building

This part is if you want to contribute to the application only.

###Requirements

* [Composer](https://getcomposer.org/download/) (must be in `$PATH`)
* [NodeJS](https://nodejs.org/download/) (must be in `$PATH`)

###Setup

You need to clone the repository and make it avaible to Apache. More informations in the Installation section.

```bash
git clone git@github.com:GeoffreyFrogeye/ipbx-cdr.git
cd ipbx-cdr
sudo npm install -g bower
sudo npm install -g sass
sudo npm install -g gulp
npm install
bower install
gulp bootstrap
```

###Let's dev!

```bash
gulp --dev
```
