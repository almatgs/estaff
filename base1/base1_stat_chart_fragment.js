	var barChartData = <%=EncodeJson( env.chartData )%>;

		var ctx = document.getElementById("canvas").getContext("2d");
		window.myBar = new Chart(ctx).Bar(barChartData, {
			responsive : true,
			multiTooltipTemplate: "<" + "%= datasetLabel %> - <" + "%= value %>"
		});

