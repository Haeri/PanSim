import csv
import re



region_dict = {}

with open('20695_131.csv', 'r') as file:
    reader = csv.reader(file, delimiter=';')
    for row in reader:
        id, title, data = row
        region_dict[id] = {title, data}


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




