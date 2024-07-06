import React, { useEffect } from "react";
import "./FindNearestPetrolPump.css";

const FindNearestPetrolPump = () => {
  useEffect(() => {
    let map;

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const loadMapScripts = async () => {
      try {
        await loadScript("https://js.api.here.com/v3/3.1/mapsjs-core.js");
        await loadScript("https://js.api.here.com/v3/3.1/mapsjs-service.js");
        await loadScript("https://js.api.here.com/v3/3.1/mapsjs-ui.js");
        await loadScript("https://js.api.here.com/v3/3.1/mapsjs-mapevents.js");
        initMap();
      } catch (error) {
        console.error("Error loading HERE Maps scripts:", error);
      }
    };

    const initMap = () => {
      if (!window.H || !window.H.service) {
        console.error("HERE Maps API not available");
        return;
      }

      const platform = new window.H.service.Platform({
        apikey: "ZAQJXrHyf6ID9j-OShN8KhD2E01-Uk_t8gev6lWFcMM",
      });
      const defaultLayers = platform.createDefaultLayers();

      if (!map) {
        map = new window.H.Map(
          document.getElementById("map"),
          defaultLayers.vector.normal.map,
          {
            center: { lat: 37.376, lng: -122.034 },
            zoom: 15,
            pixelRatio: window.devicePixelRatio || 1,
          }
        );

        const behavior = new window.H.mapevents.Behavior(
          new window.H.mapevents.MapEvents(map)
        );
        const ui = window.H.ui.UI.createDefault(map, defaultLayers);

        window.addEventListener("resize", () => map.getViewPort().resize());

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            searchNearbyPetrolPump(
              platform,
              { lat: latitude, lng: longitude },
              map,
              ui
            );
          },
          (error) => {
            console.error("Error getting geolocation:", error);
          }
        );
      }
    };

    const searchNearbyPetrolPump = (platform, coordinates, map, ui) => {
      const geocoder = platform.getSearchService();
      const searchParameters = {
        q: "petrol pump",
        at: `${coordinates.lat},${coordinates.lng}`,
        limit: 3,
      };

      geocoder.discover(
        searchParameters,
        (result) => {
          const locations = result.items;
          if (locations.length > 0) {
            addLocationsToMap(locations, map, ui);
            addLocationsToPanel(locations); // Add this line to update the panel
            calculateRouteToPetrolPump(platform, coordinates, locations[0].position);
          } else {
            alert("No petrol pumps found nearby.");
          }
        },
        (error) => {
          console.error("Error with geocoder discover:", error);
          alert("Can't reach the remote server");
        }
      );
    };

    const addLocationsToMap = (locations, map, ui) => {
      map.removeObjects(map.getObjects());

      const group = new window.H.map.Group();
      locations.forEach((location) => {
        const marker = new window.H.map.Marker(location.position);
        marker.label = location.title;
        group.addObject(marker);
      });

      group.addEventListener(
        "tap",
        (evt) => {
          map.setCenter(evt.target.getGeometry());
          openBubble(evt.target.getGeometry(), evt.target.label, ui);
        },
        false
      );

      map.addObject(group);
      map.getViewModel().setLookAtData({
        bounds: group.getBoundingBox(),
      });
      map.setZoom(Math.min(map.getZoom(), 16));
    };

    const openBubble = (position, text, ui) => {
      const bubble = new window.H.ui.InfoBubble(position, { content: text });
      ui.addBubble(bubble);
    };

    const calculateRouteToPetrolPump = (platform, start, end) => {
      const router = platform.getRoutingService(null, 8);
      const routeRequestParams = {
        routingMode: "fast",
        transportMode: "car",
        origin: `${start.lat},${start.lng}`,
        destination: `${end.lat},${end.lng}`,
        return:
          "polyline,turnByTurnActions,actions,instructions,travelSummary",
      };

      router.calculateRoute(
        routeRequestParams,
        (result) => {
          onSuccess(result, platform);
        },
        (error) => {
          onError(error);
        }
      );
    };

    const onSuccess = (result, platform) => {
      const route = result.routes[0];
      addRouteToMap(route);
    };

    const onError = (error) => {
      console.error("Routing error:", error);
      alert("Failed to calculate the route.");
    };

    const addRouteToMap = (route) => {
      route.sections.forEach((section) => {
        let linestring = window.H.geo.LineString.fromFlexiblePolyline(
          section.polyline
        );

        let polyline = new window.H.map.Polyline(linestring, {
          style: {
            lineWidth: 6, 
            strokeColor: "rgb(34,204,0)",
          },
        });

        map.addObject(polyline);
        map.getViewModel().setLookAtData({
          bounds: polyline.getBoundingBox(),
        });
      });
    };

    const addLocationsToPanel = (locations) => {
      const locationsContainer = document.getElementById("panel");
      locationsContainer.innerHTML = '';

      locations.forEach((location) => {
        const divLabel = document.createElement("div");
        let content = `<strong style="font-size: large;">${location.title}</strong><br/>`;
        const position = location.position;

        content += `<strong>Address:</strong> ${location.address.label}<br/>`;
        content += `<strong>Position:</strong> ${position.lat.toFixed(4)}N, ${position.lng.toFixed(4)}E<br/>`;

        divLabel.innerHTML = content;
        locationsContainer.appendChild(divLabel);

        console.log("Nearest petrol pump:");
        console.log("Name:", location.title);
        console.log("Distance:", location.distance);
      });
    };

    loadMapScripts();
  }, []);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Find Nearest Petrol Pump</h1>
        <p>
          Request the location of the nearest petrol pump and display it on
          the map.
        </p>
      </div>
      <div id="panel" className="panel"></div>
      <div id="map" style={{ width: "100%", height: "800px" }}></div>
    </div>
  );
};

export default FindNearestPetrolPump;
