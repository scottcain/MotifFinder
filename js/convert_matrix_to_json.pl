#!/usr/bin/perl
use strict;
use warnings;

print "{\n   \"matrices\" : [\n";

my @lines = <>;

my $counter = 0;
for (my $i=0;$i<scalar @lines;$i=$i+5) {
    chomp $lines[$i];
    chomp $lines[$i+1];
    chomp $lines[$i+2];
    chomp $lines[$i+3];
    chomp $lines[$i+4];

    $lines[$i+1] =~ s/\t/ /g;
    $lines[$i+2] =~ s/\t/ /g;
    $lines[$i+3] =~ s/\t/ /g;
    $lines[$i+4] =~ s/\t/ /g;

    print "      {\n";
    print "         \"name\" : \"$lines[$i]\",\n";
    print "         \"matrix\" : {\n";
    print "            \"A\" : \"$lines[$i+1]\",\n";
    print "            \"C\" : \"$lines[$i+2]\",\n";
    print "            \"G\" : \"$lines[$i+3]\",\n";
    print "            \"T\" : \"$lines[$i+4]\"\n";
    print "         }\n";
    print "      },\n";
}

print "   ]\n}\n";
