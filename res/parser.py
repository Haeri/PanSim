import csv
import re

region_dict = {}

with open('20695_131.csv', 'r', encoding='utf-8-sig') as file:
	reader = csv.reader(file, delimiter=';')
	headers = next(reader)
	for row in reader:
		region_dict[row[0]] = (row[1], row[2])

svg_file = ""
pattern = re.compile('\s*<path id="geo_1237_(\d*)"')

with open('switzerland.svg', 'r') as file:
	for line in file:
		match = pattern.match(line)
		if match:
			id = match.group(1) 
			if id in region_dict:
				title, data = region_dict[id]
				line = re.sub('" data-name=', '" data-title="' + title + '" data-pop="' + data + '" data-name=' , line)
			else:
				print("Error in key:", id)
		svg_file += line

f = open("switzerland_patched.svg", "w")
f.write(svg_file)
f.close()


